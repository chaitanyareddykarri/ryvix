import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateRandomOtp, renewLoginChallenge } from "@/utils/auth-security";
import { sendOtpEmail } from "@/utils/email-service";
import { registerAuthChallenge } from "@/utils/auth-challenge-store";

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
    let newChallenge: string;
    try {
      newChallenge = renewLoginChallenge(challengeCookie, email, newOtp);
    } catch {
      return NextResponse.json({ error: "Invalid or expired session. Please sign in again." }, { status: 401 });
    }
    if (!await registerAuthChallenge(newChallenge, email, 'login', challengeCookie)) {
      return NextResponse.json({ error: 'Verification request expired or rate limited. Please wait and restart login.' }, { status: 429 });
    }
    const emailRes = await sendOtpEmail({
      to: email,
      otp: newOtp,
      type: "login",
    }).catch(() => ({ success: false }));

    // The ledger already replaced the old token. Return its matching cookie even
    // when delivery fails, so a later resend can pass the token-hash check.
    const response = emailRes.success ? NextResponse.json({
      success: true,
      message: "A fresh 6-digit verification code has been dispatched to your email.",
    }) : NextResponse.json({
      error: "Could not deliver the code. Wait one minute before resending; if the session expires, restart login.",
    }, { status: 502 });

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
