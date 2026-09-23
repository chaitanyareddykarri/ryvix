import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { verifyLoginChallenge } from "@/utils/auth-security";

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
    const token = body.token?.trim();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Verification code and email are required." },
        { status: 400 }
      );
    }

    if (token.length !== 6 || !/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: "The verification code must be exactly 6 numeric digits." },
        { status: 400 }
      );
    }

    // 1. Verify that the user successfully completed password authentication in Step 1
    if (!challengeCookie) {
      return NextResponse.json(
        {
          error:
            "Login session expired or invalid. Please return to login and enter your password.",
        },
        { status: 401 }
      );
    }

    const challengeCheck = verifyLoginChallenge(challengeCookie, email);
    if (!challengeCheck.valid) {
      return NextResponse.json(
        {
          error:
            challengeCheck.error === "Challenge expired"
              ? "Verification session expired. Please re-enter your password."
              : "Invalid authentication challenge. Please return to login.",
        },
        { status: 401 }
      );
    }

    // 2. Prepare cookies container for genuine Supabase session establishment
    const response = NextResponse.json({
      success: true,
      redirect: "/dashboard",
    });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // 3. Verify the 6-digit login email OTP with Supabase Auth
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("expired")) {
        return NextResponse.json(
          {
            error:
              "This verification code has expired. Please request a new code.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error: "The verification code is incorrect. Please try again.",
        },
        { status: 400 }
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: "Verification completed but no active session was returned." },
        { status: 500 }
      );
    }

    // 4. Clear the challenge cookie upon successful 2FA login
    response.cookies.delete("ryvix_login_challenge");

    return response;
  } catch (err: unknown) {
    console.error("[Login Step 2 Fatal Error]:", err);
    return NextResponse.json(
      { error: "Verification failed due to a server error. Please try again." },
      { status: 500 }
    );
  }
}
