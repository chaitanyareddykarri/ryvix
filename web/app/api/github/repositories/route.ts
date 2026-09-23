import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoName = searchParams.get("repo");
  const owner = searchParams.get("owner");
  const wantBranches = searchParams.get("branches") === "true";
  const search = (searchParams.get("q") || "").toLowerCase();

  const cookieStore = await cookies();
  const token = cookieStore.get("gh_session_token")?.value;
  const ghLogin = cookieStore.get("gh_user_login")?.value;

  if (!token) {
    return NextResponse.json({
      connected: false,
      oauthConfigured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      message: "GitHub account is not connected. Please authorize GitHub or enter a token.",
      repositories: [],
    });
  }

  try {
    // Case 1: Fetch branches for a specific repository
    if (wantBranches && owner && repoName) {
      const branchRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/branches?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Ryvix-Platform",
          },
        }
      );

      if (!branchRes.ok) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to fetch branches: ${branchRes.statusText}`,
          },
          { status: branchRes.status }
        );
      }

      const branchData = await branchRes.json();
      const branches = Array.isArray(branchData)
        ? branchData.map((b: any) => ({
            name: b.name,
            protected: b.protected || false,
            commitSha: b.commit?.sha,
          }))
        : [];

      return NextResponse.json({
        success: true,
        branches,
      });
    }

    // Case 2: Fetch list of accessible repositories
    const reposRes = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Ryvix-Platform",
        },
      }
    );

    if (!reposRes.ok) {
      if (reposRes.status === 401) {
        cookieStore.delete("gh_session_token");
        return NextResponse.json(
          {
            connected: false,
            error: "GitHub token expired or revoked. Please reconnect.",
            repositories: [],
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: `GitHub API error: ${reposRes.statusText}`,
          repositories: [],
        },
        { status: reposRes.status }
      );
    }

    const reposData = await reposRes.json();

    let repositories = Array.isArray(reposData)
      ? reposData.map((r: any) => ({
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          owner: r.owner?.login,
          ownerAvatar: r.owner?.avatar_url,
          defaultBranch: r.default_branch || "main",
          isPrivate: r.private || false,
          description: r.description || "",
          htmlUrl: r.html_url,
          cloneUrl: r.clone_url,
          language: r.language || "Unknown",
          updatedAt: r.updated_at,
          permissions: r.permissions || {},
        }))
      : [];

    if (search) {
      repositories = repositories.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.fullName.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      connected: true,
      userLogin: ghLogin,
      count: repositories.length,
      repositories,
    });
  } catch (err: any) {
    console.error("[GitHub Repos Fetch Error]:", err);
    return NextResponse.json(
      {
        connected: true,
        error: err.message || "Failed to query GitHub repositories",
        repositories: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid GitHub personal access token" },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();

    // Verify token with GitHub User API
    const ghUserRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Ryvix-Platform",
      },
    });

    if (!ghUserRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "GitHub rejected this token. Make sure it has 'repo' scope and has not expired.",
        },
        { status: 401 }
      );
    }

    const ghUser = await ghUserRes.json();
    const cookieStore = await cookies();

    // Store in HTTP-only session cookie
    cookieStore.set("gh_session_token", cleanToken, {
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

    // Also persist installation in Supabase if user is authenticated
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

      if (profile?.organization_id) {
        await supabase.from("repository_installations").upsert(
          {
            organization_id: profile.organization_id,
            installation_id: Number(ghUser.id),
            account_login: ghUser.login,
            account_type: ghUser.type === "Organization" ? "organization" : "user",
            permissions: {
              scope: "repo,read:org",
              connected_at: new Date().toISOString(),
              target_login: ghUser.login,
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,installation_id" }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Connected successfully as @${ghUser.login}`,
      userLogin: ghUser.login,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify token" },
      { status: 500 }
    );
  }
}
