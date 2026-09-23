import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateRandomOtp, createSignupChallenge } from "@/utils/auth-security";
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

    // Unpack previous challenge to preserve name and password with new OTP
    const { verifySignupChallenge } = await import("@/utils/auth-security");
    // We can decrypt existing challenge
    const crypto = await import("crypto");
    const CHALLENGE_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "ryvix-auth-challenge-secret-salt-2026";
    const KEY = crypto.createHash("sha256").update(CHALLENGE_SECRET).digest();
    
    let fullName = "";
    let password = "";
    try {
      const raw = Buffer.from(challengeCookie, "base64url");
      const iv = raw.subarray(0, 12);
      const tag = raw.subarray(12, 28);
      const encrypted = raw.subarray(28);
      const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
      decipher.setAuthTag(tag);
      const dec = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8"));
      fullName = dec.fullName || "";
      password = dec.password || "";
    } catch {
      return NextResponse.json({ error: "Session invalid. Please restart registration." }, { status: 401 });
    }

    const newChallenge = createSignupChallenge({ email, fullName, password, otp: newOtp });

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
