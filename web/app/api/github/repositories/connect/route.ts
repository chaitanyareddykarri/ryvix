import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
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
      return NextResponse.json({ success: true, repositories: [] });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ success: true, repositories: [] });
    }

    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("organization_id", profile.organization_id);

    const projectIds = (projects || []).map((p: any) => p.id);
    if (projectIds.length === 0) {
      return NextResponse.json({ success: true, repositories: [] });
    }

    const { data: repos, error } = await supabase
      .from("repositories")
      .select("*")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

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
    const body = await request.json();
    const {
      repoId,
      fullName,
      owner,
      repoName,
      selectedBranch,
      isPrivate,
      cloneUrl,
      defaultBranch,
      projectId: requestedProjectId,
    } = body;

    if (!fullName || !repoId) {
      return NextResponse.json(
        { success: false, error: "Missing required repository metadata (repoId, fullName)" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Resolve organization and project
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.organization_id;
    let targetProjectId = requestedProjectId;

    if (!targetProjectId && orgId) {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("organization_id", orgId)
        .limit(1)
        .single();
      targetProjectId = project?.id;
    }

    if (!targetProjectId) {
      const { data: projects } = await supabase.from("projects").select("id").limit(1);
      if (projects && projects.length > 0) {
        targetProjectId = projects[0].id;
      }
    }

    // 3. Stack Detection
    let detectedStack = "generic";
    const nameLower = (fullName || "").toLowerCase();
    if (nameLower.includes("next") || nameLower.includes("web") || nameLower.includes("front")) {
      detectedStack = "nextjs";
    } else if (nameLower.includes("api") || nameLower.includes("node") || nameLower.includes("server")) {
      detectedStack = "nodejs";
    } else if (nameLower.includes("py") || nameLower.includes("fastapi")) {
      detectedStack = "python_fastapi";
    } else if (nameLower.includes("go") || nameLower.includes("kube")) {
      detectedStack = "golang";
    }

    // 4. Save to public.repositories table with exact schema match
    const targetBranch = selectedBranch || defaultBranch || "main";
    const repoPayload: any = {
      project_id: targetProjectId,
      github_repo_id: Number(repoId),
      full_name: fullName,
      default_branch: targetBranch,
      clone_url: cloneUrl || `https://github.com/${fullName}.git`,
      is_private: Boolean(isPrivate),
      detected_stack: [detectedStack], // schema requires text[]
      updated_at: new Date().toISOString(),
    };

    // Insert or update repository
    const { data: savedRepo, error: upsertErr } = await supabase
      .from("repositories")
      .upsert(repoPayload, { onConflict: "project_id,github_repo_id" })
      .select()
      .single();

    if (upsertErr) {
      console.warn("[Repository Save Notice]:", upsertErr.message);
      const { data: insertedRepo, error: insertErr } = await supabase
        .from("repositories")
        .insert(repoPayload)
        .select()
        .single();

      if (insertErr) {
        throw new Error(`Failed to store repository connection: ${insertErr.message}`);
      }
    }

    // 5. Create an audit log event matching public.audit_events schema
    if (targetProjectId) {
      const paramHash = crypto
        .createHash("sha256")
        .update(JSON.stringify({ fullName, targetBranch }))
        .digest("hex");

      await supabase.from("audit_events").insert({
        project_id: targetProjectId,
        action_name: "repository.connect",
        status: "success",
        actor_id: user.id,
        actor_type: "user",
        parameters_hash: paramHash,
        diff_summary: `Connected repository ${fullName} on branch ${targetBranch}`,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Repository connected successfully",
      repository: savedRepo || repoPayload,
      detectedStack,
      selectedBranch: targetBranch,
    });
  } catch (err: any) {
    console.error("[Connect Repository Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to connect repository" },
      { status: 500 }
    );
  }
}
