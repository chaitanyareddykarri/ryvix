import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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
      message: "GitHub account is not connected. Please authorize GitHub first.",
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
        // Token expired or revoked
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
