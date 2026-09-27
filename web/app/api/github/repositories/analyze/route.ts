import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { RepositoryAnalyzer } from "@/utils/repository-analyzer";

export const dynamic = "force-dynamic";

async function handleAnalysis(owner: string | null, repo: string | null, requestedBranch: string | null) {
  if (!owner || !repo) {
    return NextResponse.json(
      { success: false, error: "Repository owner and name are required." },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("gh_session_token")?.value;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: "GitHub is not connected. Please connect your GitHub account to analyze this website.",
      },
      { status: 401 }
    );
  }

  try {
    let defaultBranch = requestedBranch;
    const repoInfoRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Ryvix-Platform",
        },
      }
    );

    if (!repoInfoRes.ok) {
      if (repoInfoRes.status === 401) {
        cookieStore.delete("gh_session_token");
        return NextResponse.json(
          { success: false, error: "Your GitHub session expired. Please reconnect your GitHub account." },
          { status: 401 }
        );
      }
      if (repoInfoRes.status === 404) {
        return NextResponse.json(
          { success: false, error: "Repository not found or access was revoked." },
          { status: 404 }
        );
      }
      if (repoInfoRes.status === 403) {
        return NextResponse.json(
          { success: false, error: "GitHub rate limit reached or insufficient permissions. Please try again shortly." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { success: false, error: `GitHub error: ${repoInfoRes.statusText}` },
        { status: repoInfoRes.status }
      );
    }

    const repoInfo = await repoInfoRes.json();
    if (!defaultBranch) {
      defaultBranch = repoInfo.default_branch || "main";
    }

    const treeRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(defaultBranch!)}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Ryvix-Platform",
        },
      }
    );

    let filePaths: string[] = [];
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      if (Array.isArray(treeData.tree)) {
        filePaths = treeData.tree
          .filter((item: any) => item.type === "blob")
          .map((item: any) => item.path)
          .slice(0, 2000);
      }
    } else {
      const contentsRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Ryvix-Platform",
          },
        }
      );
      if (contentsRes.ok) {
        const contents = await contentsRes.json();
        if (Array.isArray(contents)) {
          filePaths = contents.map((c: any) => c.name);
        }
      }
    }

    const manifests: Record<string, string> = {};
    const manifestFilesToFetch = ["package.json", "pyproject.toml", "requirements.txt", "go.mod", "Cargo.toml"];

    for (const manifestName of manifestFilesToFetch) {
      const foundPath = filePaths.find((p) => p.toLowerCase().endsWith(manifestName.toLowerCase()));
      if (foundPath) {
        try {
          const rawRes = await fetch(
            `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(defaultBranch!)}/${foundPath}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "User-Agent": "Ryvix-Platform",
              },
            }
          );
          if (rawRes.ok) {
            const text = await rawRes.text();
            if (text.length < 256 * 1024) {
              manifests[manifestName] = text;
            }
          }
        } catch {
          // silently continue
        }
      }
    }

    const analysis = RepositoryAnalyzer.analyze(filePaths, manifests);

    return NextResponse.json({
      success: true,
      repository: {
        id: repoInfo.id,
        name: repoInfo.name,
        fullName: repoInfo.full_name,
        owner: repoInfo.owner?.login || owner,
        defaultBranch,
        isPrivate: repoInfo.private || false,
        description: repoInfo.description || "",
        cloneUrl: repoInfo.clone_url,
      },
      analysis,
    });
  } catch (err: any) {
    console.error("[Repository Analyze Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to inspect repository at this time. Please check your GitHub permissions and try again.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const branch = searchParams.get("branch");
  return handleAnalysis(owner, repo, branch);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    return handleAnalysis(body.owner || null, body.repo || null, body.branch || null);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Invalid request body" }, { status: 400 });
  }
}
