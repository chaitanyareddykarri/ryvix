import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("gh_oauth_state")?.value;
  const returnTo = cookieStore.get("gh_oauth_return")?.value || "/dashboard";

  // Clean up oauth state cookie
  cookieStore.delete("gh_oauth_state");
  cookieStore.delete("gh_oauth_return");

  if (error) {
    console.error("[GitHub OAuth Error]:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`${returnTo}?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(
      new URL(`${returnTo}?error=Invalid+OAuth+State+or+Missing+Code`, request.url)
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`${returnTo}?error=GitHub+Credentials+Not+Configured`, request.url)
    );
  }

  try {
    // 1. Exchange code for GitHub access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("[GitHub Token Error]:", tokenData);
      return NextResponse.redirect(
        new URL(`${returnTo}?error=${encodeURIComponent(tokenData.error_description || "Token Exchange Failed")}`, request.url)
      );
    }

    const accessToken = tokenData.access_token;
    const tokenScope = tokenData.scope || "";

    // 2. Fetch authenticated GitHub user details
    const ghUserRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Ryvix-Platform",
      },
    });

    if (!ghUserRes.ok) {
      throw new Error(`Failed to fetch GitHub user details: ${ghUserRes.statusText}`);
    }

    const ghUser = await ghUserRes.json();

    // 3. Link with Supabase User & Organization
    const supabase = createClient(cookieStore);
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (supabaseUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", supabaseUser.id)
        .single();

      const orgId = profile?.organization_id;

      if (orgId) {
        // Upsert repository installation matching exact schema
        await supabase.from("repository_installations").upsert(
          {
            organization_id: orgId,
            installation_id: Number(ghUser.id),
            account_login: ghUser.login,
            account_type: ghUser.type === "Organization" ? "organization" : "user",
            permissions: {
              scope: tokenScope,
              connected_at: new Date().toISOString(),
              target_login: ghUser.login,
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,installation_id" }
        );
      }
    }

    // 4. Set secure session cookie containing the token
    cookieStore.set("gh_session_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    cookieStore.set("gh_user_login", ghUser.login, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.redirect(
      new URL(`${returnTo}?github=connected&user=${encodeURIComponent(ghUser.login)}`, request.url)
    );
  } catch (err: any) {
    console.error("[GitHub Callback Fatal Error]:", err);
    return NextResponse.redirect(
      new URL(`${returnTo}?error=${encodeURIComponent(err.message || "Failed to complete GitHub authorization")}`, request.url)
    );
  }
}
