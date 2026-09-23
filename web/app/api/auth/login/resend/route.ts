import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { verifyLoginChallenge, createLoginChallenge } from "@/utils/auth-security";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://tsoyrpgifovzwqtgpkkb.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_1QBmq8pKJ3ssCAGufAzfYw_IdB6sYsY";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const challengeCookie = cookieStore.get("ryvix_login_challenge")?.value;

    const body = await request.json().catch(() => ({}));
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required to resend verification code." },
        { status: 400 }
      );
    }

    if (!challengeCookie) {
      return NextResponse.json(
        {
          error:
            "Authentication challenge expired. Please re-enter your password to request a new code.",
        },
        { status: 401 }
      );
    }

    const challengeCheck = verifyLoginChallenge(challengeCookie, email);
    if (!challengeCheck.valid) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired authentication challenge. Please return to login.",
        },
        { status: 401 }
      );
    }

    // Re-dispatch OTP via Supabase
    const isolatedSupabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    });

    const { error: otpError } = await isolatedSupabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (otpError) {
      return NextResponse.json(
        {
          error:
            "Rate limit exceeded or delivery error. Please wait 45 seconds before requesting another code.",
        },
        { status: 429 }
      );
    }

    // Refresh challenge token
    const newChallenge = createLoginChallenge(email);
    const response = NextResponse.json({
      success: true,
      message: "A fresh 6-digit verification code has been dispatched to your email.",
    });

    response.cookies.set("ryvix_login_challenge", newChallenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("[Login Resend Error]:", err);
    return NextResponse.json(
      { error: "Failed to resend code due to an unexpected error." },
      { status: 500 }
    );
  }
}
