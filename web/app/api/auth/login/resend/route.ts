import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateRandomOtp, createLoginOtpChallenge } from "@/utils/auth-security";
import { sendOtpEmail } from "@/utils/email-service";

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
        { error: "Authentication challenge expired. Please re-enter your password to request a new code." },
        { status: 401 }
      );
    }

    // Generate fresh random 6-digit OTP
    const newOtp = generateRandomOtp();
    const emailRes = await sendOtpEmail({
      to: email,
      otp: newOtp,
      type: "login",
    });

    if (!emailRes.success) {
      return NextResponse.json(
        { error: "Failed to resend verification code. Please wait a moment and try again." },
        { status: 500 }
      );
    }

    const newChallenge = createLoginOtpChallenge(email, newOtp);
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
