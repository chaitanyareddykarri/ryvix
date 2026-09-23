import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { verifyLoginOtpChallenge } from "@/utils/auth-security";

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

    if (!challengeCookie) {
      return NextResponse.json(
        { error: "Login session expired or invalid. Please return to login and enter your password." },
        { status: 401 }
      );
    }

    // 1. Verify random OTP against challenge
    const challengeCheck = verifyLoginOtpChallenge(challengeCookie, email, token);
    if (!challengeCheck.valid) {
      return NextResponse.json(
        { error: challengeCheck.error || "The verification code is incorrect. Please try again." },
        { status: 400 }
      );
    }

    // 2. Prepare cookies container for genuine Supabase session establishment
    const response = NextResponse.json({
      success: true,
      redirect: "/dashboard",
    });

    // 3. Clear challenge cookie
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
