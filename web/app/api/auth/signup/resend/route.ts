import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateRandomOtp, renewSignupChallenge } from "@/utils/auth-security";
import { sendOtpEmail } from "@/utils/email-service";
import { registerAuthChallenge } from "@/utils/auth-challenge-store";

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

    if (!await registerAuthChallenge(newChallenge, email, 'signup', challengeCookie)) {
      return NextResponse.json({ error: 'Verification request expired or rate limited. Please wait and restart registration.' }, { status: 429 });
    }
    const emailRes = await sendOtpEmail({
      to: email,
      otp: newOtp,
      type: "signup",
    }).catch(() => ({ success: false }));

    // The ledger already replaced the old token. Return its matching cookie even
    // when delivery fails, so a later resend can pass the token-hash check.
    const response = emailRes.success ? NextResponse.json({
      success: true,
      message: "A fresh 6-digit verification code has been dispatched to your email.",
    }) : NextResponse.json({
      error: "Could not deliver the code. Wait one minute before resending; if the session expires, restart registration.",
    }, { status: 502 });

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
