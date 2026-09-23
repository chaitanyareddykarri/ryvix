import { NextResponse } from "next/server";
import { Client } from "pg";
import { generateRandomOtp, maskEmail, createSignupChallenge } from "@/utils/auth-security";
import { sendOtpEmail } from "@/utils/email-service";

function getDbUrl(): string {
  return process.env.DATABASE_URL || "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const fullName = body.fullName?.trim() || "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    // 1. Check if user already exists in auth.users
    const dbUrl = getDbUrl();
    if (dbUrl) {
      const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
      try {
        await client.connect();
        const checkRes = await client.query("SELECT id FROM auth.users WHERE email = $1 LIMIT 1", [email]);
        if (checkRes.rowCount && checkRes.rowCount > 0) {
          await client.end();
          return NextResponse.json(
            { error: "An account with this email already exists. Please sign in instead." },
            { status: 400 }
          );
        }
      } catch (dbErr: any) {
        console.warn("[Signup Step 1] Database pre-check warning:", dbErr.message);
      } finally {
        try { await client.end(); } catch {}
      }
    }

    // 2. Generate a genuine cryptographically random 6-digit OTP
    const randomOtp = generateRandomOtp();

    // 3. Dispatch OTP email directly via Resend
    const emailRes = await sendOtpEmail({
      to: email,
      otp: randomOtp,
      type: "signup",
      fullName,
    });

    if (!emailRes.success) {
      console.error("[Signup Step 1] Email dispatch failed:", emailRes.error);
      return NextResponse.json(
        { error: "Failed to send verification email. Please check your email address or try again." },
        { status: 500 }
      );
    }

    // 4. Create encrypted challenge token
    const challengeToken = createSignupChallenge({
      email,
      fullName,
      password,
      otp: randomOtp,
    });

    const response = NextResponse.json({
      success: true,
      requireOtp: true,
      maskedEmail: maskEmail(email),
    });

    // 5. Store challenge in HTTP-only cookie (10 min TTL)
    response.cookies.set("ryvix_signup_challenge", challengeToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("[Signup Step 1 Fatal Error]:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during signup. Please try again." },
      { status: 500 }
    );
  }
}
