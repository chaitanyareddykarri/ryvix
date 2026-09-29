import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateRandomOtp, renewSignupChallenge } from "@/utils/auth-security";
import { sendOtpEmail } from "@/utils/email-service";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const challengeCookie = cookieStore.get("ryvix_signup_challenge")?.value;

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
        { error: "Registration session expired. Please re-enter your details." },
        { status: 401 }
      );
    }

    // Generate a fresh random 6-digit OTP
    const newOtp = generateRandomOtp();
    let newChallenge: string;
    try {
      newChallenge = renewSignupChallenge(challengeCookie, email, newOtp);
    } catch {
      return NextResponse.json({ error: "Invalid or expired session. Please restart registration." }, { status: 401 });
    }

    const emailRes = await sendOtpEmail({
      to: email,
      otp: newOtp,
      type: "signup",
    });

    if (!emailRes.success) {
      return NextResponse.json(
        { error: "Failed to resend verification code. Please wait a moment and try again." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "A fresh 6-digit verification code has been dispatched to your email.",
    });

    response.cookies.set("ryvix_signup_challenge", newChallenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("[Signup Resend Error]:", err);
    return NextResponse.json(
      { error: "Failed to resend code due to an unexpected error." },
      { status: 500 }
    );
  }
}
