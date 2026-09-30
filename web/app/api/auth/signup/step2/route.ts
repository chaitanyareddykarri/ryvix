import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDirectDbPool } from "@/utils/direct-db";
import { createServerClient } from "@supabase/ssr";
import { verifySignupChallenge } from "@/utils/auth-security";
import { consumeAuthChallenge } from "@/utils/auth-challenge-store";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://tsoyrpgifovzwqtgpkkb.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_1QBmq8pKJ3ssCAGufAzfYw_IdB6sYsY";

function getDbUrl(): string {
  return process.env.DATABASE_URL || "";
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const challengeCookie = cookieStore.get("ryvix_signup_challenge")?.value;

    const body = await request.json().catch(() => ({}));
    const email = body.email?.trim().toLowerCase();
    const token = body.token?.trim();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and 6-digit verification code are required." },
        { status: 400 }
      );
    }

    if (!challengeCookie) {
      return NextResponse.json(
        { error: "Registration session expired. Please re-enter your details to create an account." },
        { status: 401 }
      );
    }

    // 1. Verify 6-digit OTP against encrypted challenge
    const check = verifySignupChallenge(challengeCookie, email, token);
    const accepted = await consumeAuthChallenge(challengeCookie, email, 'signup', !!(check.valid && check.userData));
    if (!accepted || !check.valid || !check.userData) {
      return NextResponse.json(
        { error: check.error || "The verification code is incorrect. Please try again." },
        { status: 400 }
      );
    }

    const { email: userEmail, fullName, password } = check.userData;

    // 2. Insert verified user into PostgreSQL (auth.users and auth.identities)
    const dbUrl = getDbUrl();
    if (!dbUrl) {
      return NextResponse.json(
        { error: "Database configuration error. Please contact administrator." },
        { status: 500 }
      );
    }

    const pool = getDirectDbPool();
    const client = await pool.connect();
    client.on("error", (err) => console.warn("[Signup Step 2 Client Notice]:", err.message));

    let newUserId: string;

    try {
      // Check if user already exists
      const existing = await client.query("SELECT id FROM auth.users WHERE email = $1 LIMIT 1", [userEmail]);
      if (existing.rowCount && existing.rowCount > 0) {
        newUserId = existing.rows[0].id;
      } else {
        // Insert into auth.users with all non-null GoTrue fields populated
        const insertUserRes = await client.query(`
          INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            email_change_token_current,
            reauthentication_token,
            phone_change,
            phone_change_token,
            is_super_admin
          ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            $1,
            extensions.crypt($2, extensions.gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', $3::text),
            NOW(),
            NOW(),
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            false
          ) RETURNING id;
        `, [userEmail, password, fullName]);

        newUserId = insertUserRes.rows[0].id;

        // Insert into auth.identities
        await client.query(`
          INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            $1::uuid,
            jsonb_build_object('sub', $1::text, 'email', $2::text),
            'email',
            $1::text,
            NOW(),
            NOW(),
            NOW()
          );
        `, [newUserId, userEmail]);
      }
    } finally {
      client.release();
    }

    // 3. Establish genuine Supabase session via password login
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

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });

    if (signInError || !signInData?.session || !signInData.user) {
      return NextResponse.json({ error: "Account registration was processed, but sign-in failed. Please return to login." }, { status: 401 });
    }

    // 4. Delete the registration challenge cookie
    response.cookies.delete("ryvix_signup_challenge");

    return response;
  } catch (err: unknown) {
    console.error("[Signup Step 2 Fatal Error]:", err);
    return NextResponse.json(
      { error: "Account creation failed due to a server error. Please try again." },
      { status: 500 }
    );
  }
}
