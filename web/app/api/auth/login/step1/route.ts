import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { maskEmail, generateRandomOtp, createLoginOtpChallenge } from "@/utils/auth-security";
import { sendOtpEmail } from "@/utils/email-service";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://tsoyrpgifovzwqtgpkkb.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_1QBmq8pKJ3ssCAGufAzfYw_IdB6sYsY";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 400 }
      );
    }

    // 1. Create isolated Supabase client that does NOT write cookies to the client browser
    const isolatedSupabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    });

    // 2. Validate user credentials
    const { data: authData, error: authError } =
      await isolatedSupabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // 3. Immediately invalidate temporary server session
    try {
      await isolatedSupabase.auth.signOut();
    } catch {}

    // 4. Generate genuine cryptographically random 6-digit OTP and send via Resend
    const randomOtp = generateRandomOtp();
    const emailRes = await sendOtpEmail({
      to: email,
      otp: randomOtp,
      type: "login",
      fullName: authData.user.user_metadata?.full_name,
    });

    if (!emailRes.success) {
      console.error("[Login Step 1 OTP dispatch error]:", emailRes.error);
      return NextResponse.json(
        { error: "Unable to dispatch verification code. Please try again." },
        { status: 500 }
      );
    }

    // 5. Generate secure encrypted challenge proof with OTP
    const challengeToken = createLoginOtpChallenge(email, randomOtp);
    const masked = maskEmail(email);

    const response = NextResponse.json({
      success: true,
      requireOtp: true,
      maskedEmail: masked,
    });

    // 6. Set HTTP-only challenge cookie (10 min TTL)
    response.cookies.set("ryvix_login_challenge", challengeToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("[Login Step 1 Fatal Error]:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during login. Please try again." },
      { status: 500 }
    );
  }
}
