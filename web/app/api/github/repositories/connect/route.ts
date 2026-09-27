import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { queryDirectDb } from "@/utils/direct-db";
import crypto from "node:crypto";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: true,
        repositories: [],
        count: 0,
      });
    }

    const profileRes = await queryDirectDb<{ organization_id: string }>(
      `SELECT organization_id FROM profiles WHERE id = $1`,
      [user.id]
    );
    const userOrgId = profileRes[0]?.organization_id;

    if (!userOrgId) {
      return NextResponse.json({ success: true, repositories: [], count: 0 });
    }

    const projects = await queryDirectDb<{ id: string }>(
      `SELECT id FROM projects WHERE organization_id = $1`,
      [userOrgId]
    );
    const projectIds = projects.map((p) => p.id);

    if (projectIds.length === 0) {
      return NextResponse.json({ success: true, repositories: [], count: 0 });
    }

    const repos = await queryDirectDb(
      `SELECT id, project_id, github_repo_id, full_name, default_branch, clone_url, is_private, detected_stack, created_at, updated_at
       FROM repositories
       WHERE project_id = ANY($1)
       ORDER BY created_at DESC`,
      [projectIds]
    );

    return NextResponse.json({
      success: true,
      repositories: repos || [],
      count: (repos || []).length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { repo, branch } = body;

    if (!repo) {
      return NextResponse.json({ success: false, error: "Repository is required" }, { status: 400 });
    }

    const profileRes = await queryDirectDb<{ organization_id: string }>(
      `SELECT organization_id FROM profiles WHERE id = $1`,
      [user.id]
    );
    const userOrgId = profileRes[0]?.organization_id;

    if (!userOrgId) {
      return NextResponse.json({ success: false, error: "Organization not found" }, { status: 400 });
    }

    let projects = await queryDirectDb<{ id: string }>(
      `SELECT id FROM projects WHERE organization_id = $1 LIMIT 1`,
      [userOrgId]
    );
    let projectId = projects[0]?.id;

    if (!projectId) {
      const newProj = await queryDirectDb<{ id: string }>(
        `INSERT INTO projects (id, organization_id, name, slug, environment, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'production', NOW(), NOW())
         RETURNING id`,
        [userOrgId, `${repo.name || "Default"} Project`, `proj-${crypto.randomBytes(4).toString("hex")}`]
      );
      projectId = newProj[0]?.id;
    }

    const repoName = repo.full_name || repo.name;
    const defaultBranch = branch || repo.default_branch || "main";
    const cloneUrl = repo.clone_url || `https://github.com/${repoName}.git`;
    const githubRepoId = String(repo.id || Date.now());

    const analysis = body.analysis || {};
    const detectedStack = [
      analysis.stack || "generic",
      analysis.language ? analysis.language.toLowerCase().replace(/[^a-z0-9]/g, "") : "unknown",
      analysis.framework ? analysis.framework.toLowerCase().replace(/[^a-z0-9]/g, "") : "web"
    ].filter((s, idx, arr) => s && arr.indexOf(s) === idx);

    const buildCmd = analysis.buildCommand || "npm run build";
    const testCmd = analysis.testCommand || "npm test";

    const savedRepos = await queryDirectDb(
      `INSERT INTO repositories (id, project_id, github_repo_id, full_name, default_branch, clone_url, is_private, detected_stack, build_command, test_command, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (project_id, full_name) DO UPDATE SET
         detected_stack = EXCLUDED.detected_stack,
         build_command = EXCLUDED.build_command,
         test_command = EXCLUDED.test_command,
         updated_at = NOW()
       RETURNING *`,
      [projectId, githubRepoId, repoName, defaultBranch, cloneUrl, Boolean(repo.private), detectedStack, buildCmd, testCmd]
    );

    // Record audit event with verified stack and deployment telemetry
    const deploymentInfo = analysis.deployment?.provider ? `CI/CD: ${analysis.deployment.provider}` : "No CI/CD";
    await queryDirectDb(
      `INSERT INTO audit_events (id, project_id, actor_id, actor_type, action_name, parameters_hash, diff_summary, status, timestamp)
       VALUES (gen_random_uuid(), $1, $2, 'user', 'repository.connect', $3, $4, 'success', NOW())`,
      [
        projectId,
        user.id,
        crypto.createHash("sha256").update(`${user.id}:${repoName}`).digest("hex"),
        `Connected website repository ${repoName} (${analysis.displayName || "Web Project"}) [${deploymentInfo}]`,
      ]
    );

    return NextResponse.json({
      success: true,
      repository: savedRepos[0] || repo,
      message: `Repository ${repoName} successfully linked and enrolled.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
