import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("return_to") || "/dashboard";

  const clientId = process.env.GITHUB_CLIENT_ID;
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/github/callback`;

  if (!clientId) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        message:
          "GitHub OAuth Client ID is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env.local to enable real GitHub OAuth.",
        setupGuide: {
          step1:
            "Go to GitHub Settings -> Developer settings -> OAuth Apps -> New OAuth App",
          step2: `Set Homepage URL to ${baseUrl}`,
          step3: `Set Authorization callback URL to ${redirectUri}`,
          step4:
            "Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to web/.env.local",
        },
      },
      { status: 412 }
    );
  }

  const state = crypto.randomBytes(24).toString("hex");
  const cookieStore = await cookies();

  cookieStore.set("gh_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  cookieStore.set("gh_oauth_return", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", clientId);
  githubAuthUrl.searchParams.set("redirect_uri", redirectUri);
  githubAuthUrl.searchParams.set("scope", "repo,read:org,user:email");
  githubAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(githubAuthUrl.toString());
}
