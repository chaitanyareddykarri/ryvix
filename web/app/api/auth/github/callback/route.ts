import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireTenant, requireOperator, RequestError } from '@/utils/tenant-context';
import { safeOAuthReturn } from '@/utils/oauth-return';

export async function GET(request: Request) {
  try { const tenant = await requireTenant(); requireOperator(tenant.role); }
  catch (error) { return NextResponse.json({ error: 'GitHub connection permission required.' }, { status: error instanceof RequestError ? error.status : 503 }); }
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("gh_oauth_state")?.value;
  const returnTo = safeOAuthReturn(cookieStore.get("gh_oauth_return")?.value);

  // Clean up oauth state cookie
  cookieStore.delete("gh_oauth_state");
  cookieStore.delete("gh_oauth_return");

  if (error) {
    console.error("GitHub OAuth authorization was rejected.");
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
      redirect: 'error', signal: AbortSignal.timeout(15000),
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

    if (!tokenResponse.ok || tokenData.error || typeof tokenData.access_token !== 'string' || !tokenData.access_token) {
      console.error("GitHub OAuth token exchange failed.");
      return NextResponse.redirect(
        new URL(`${returnTo}?error=${encodeURIComponent(tokenData.error_description || "Token Exchange Failed")}`, request.url)
      );
    }

    const accessToken = tokenData.access_token;


    // 2. Fetch authenticated GitHub user details
    const ghUserRes = await fetch("https://api.github.com/user", {
      redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Ryvix-Platform",
      },
    });

    if (!ghUserRes.ok) {
      throw new Error(`Failed to fetch GitHub user details: ${ghUserRes.statusText}`);
    }

    const ghUser = await ghUserRes.json();

    // OAuth user IDs are not GitHub App installation IDs. Persist the credential
    // at repository selection, when the authorized project is known.
    const currentTenant = await requireTenant();
    requireOperator(currentTenant.role);

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
    console.error("GitHub OAuth callback failed.");
    return NextResponse.redirect(
      new URL(`${returnTo}?error=Failed+to+complete+GitHub+authorization`, request.url)
    );
  }
}
