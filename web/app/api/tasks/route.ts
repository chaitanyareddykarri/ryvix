import { requireTenant, requireOperator, RequestError } from "@/utils/tenant-context";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { executeRepositoryTask } from "../../../../services/src/workspace/repository-task";
import { persistTaskArtifacts } from "@/utils/task-artifacts";
import { githubTokenForProject } from "@/utils/github-credentials";
import { dockerWorkspaceManager } from "@ryvix/services";
import { operationAuthorization } from "@/utils/operation-access";

export async function GET() {
  try {
    const { db, organizationId } = await requireTenant();
    const projects = await db.from("projects").select("id").eq("organization_id", organizationId);
    if (projects.error) throw new Error("Projects unavailable.");
    const ids = (projects.data || []).map(p => p.id);
    if (!ids.length) return NextResponse.json({ tasks: [] });
    const result = await db.from("tasks")
      .select("*, plans:plans!plans_task_id_fkey(*), task_artifacts(*, repositories(id, full_name)), pull_requests(*)")
      .in("project_id", ids).order("created_at", { ascending: false }).limit(50);
    if (result.error) throw new Error("Tasks unavailable.");
    const tasks = (result.data || []).map(task => {
      const artifact = Array.isArray(task.task_artifacts) ? task.task_artifacts[0] : task.task_artifacts;
      const pr = task.pull_requests?.[0];
      const { task_artifacts: _artifacts, pull_requests: _requests, ...safe } = task;
      return { ...safe, result: artifact ? { files: artifact.files, branch: artifact.base_branch,
        baseCommitSha: artifact.base_commit_sha, verification: artifact.verification } : null,
        repository: artifact?.repositories || null,
        pullRequest: pr ? { number: pr.pr_number, url: pr.html_url, branch: pr.branch_name,
          commitSha: pr.commit_sha, repository: artifact?.repositories?.full_name } : null };
    });
    return NextResponse.json({ tasks }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : "Tasks unavailable. Please retry." },
      { status: error instanceof RequestError ? error.status : 503 });
  }
}

export async function POST(request: Request) {
  let createdTaskId: string | undefined;
  let workspaceId: string | undefined;
  let authorized: Awaited<ReturnType<typeof requireTenant>> | undefined;
  try {
    authorized = await requireTenant();
    const { db, user, organizationId, role } = authorized;
    requireOperator(role);
    const body = await request.json();
    if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 10000)
      throw new RequestError("Provide a prompt of at most 10,000 characters.", 400);
    if (typeof body.repositoryId !== "string") throw new RequestError("Select a connected repository.", 400);
    const repository = await db.from("repositories").select("id,project_id,full_name,default_branch").eq("id", body.repositoryId).single();
    if (repository.error || !repository.data) throw new RequestError("Repository unavailable.", 404);
    const repo = repository.data;
    const project = await db.from("projects").select("id").eq("id", repo.project_id).eq("organization_id", organizationId).single();
    if (project.error || !project.data) throw new RequestError("Repository access denied.", 403);
    const token = await githubTokenForProject(repo.project_id, organizationId, user.id);
    const task = await db.from("tasks").insert({ project_id: repo.project_id, created_by: user.id,
      channel: "web", task_type: "coding", status: "planning", user_prompt: body.prompt.trim() }).select("id").single();
    if (task.error || !task.data) throw new Error("Task persistence failed.");
    createdTaskId = task.data.id;
    const taskId = task.data.id as string;
    const audit = operationAuthorization(db, user.id, repo.project_id);
    await audit.recordAudit({ action: "task.execute", target: taskId, status: "requested" });
    let steps: any[] = [];
    const result = await executeRepositoryTask({
      taskId, projectId: repo.project_id, fullName: repo.full_name, branch: repo.default_branch,
      githubToken: token, prompt: body.prompt.trim(),
      onPlan: async (summary, descriptions) => {
        steps = descriptions.map((description, index) => ({ step_number: index + 1, title: description,
          description, status: "planned", requires_approval: true }));
        const plan = await db.from("plans").insert({ task_id: taskId, steps, requires_approval: true }).select("id").single();
        if (plan.error || !plan.data) throw new Error("Plan persistence failed.");
        const update = await db.from("tasks").update({ active_plan_id: plan.data.id, summary, status: "executing" }).eq("id", taskId);
        if (update.error) throw new Error("Task plan update failed.");
      },
    });
    workspaceId = result.session.id;
    const { workspace_path: _path, ...persistedSession } = result.session;
    const sessionWrite = await db.from("workspace_sessions").insert(persistedSession);
    if (sessionWrite.error) throw new Error("Workspace persistence failed.");
    await persistTaskArtifacts({ taskId, repositoryId: repo.id, userId: user.id, organizationId,
      baseCommitSha: result.baseSha, baseBranch: repo.default_branch, files: result.files, verification: result.verification });
    await audit.recordAudit({ action: "task.execute", target: taskId, status: "success" });
    return NextResponse.json({ success: true, task: { id: taskId, prompt: body.prompt.trim(), title: result.summary, status: "awaiting_approval" },
      steps, result: { files: result.files, verification: result.verification },
      workspace: { sessionId: result.session.id, previewUrl: result.session.preview_url ? `/api/workspace/${result.session.id}/preview` : null,
        previewError: result.previewError, status: result.session.status } });
  } catch (error) {
    if (workspaceId) await dockerWorkspaceManager.terminateSession(workspaceId).catch(() => {});
    const message = error instanceof RequestError ? error.message : error instanceof Error &&
      /^(GitHub |Repository |Approved workspace|A restricted|No AI provider|Sandbox check|Task produced|No supported)/.test(error.message)
      ? error.message : "Task execution failed. No changes were shipped.";
    if (createdTaskId && authorized) await authorized.db.from("tasks").update({ status: "failed", error_details: message }).eq("id", createdTaskId);
    return NextResponse.json({ error: message, taskId: createdTaskId }, { status: error instanceof RequestError ? error.status : 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient(await cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const { taskId, status } = body;

    if (!taskId || !status) {
      return NextResponse.json({ error: "taskId and status are required" }, { status: 400 });
    }
    if (status !== 'cancelled') {
      return NextResponse.json({ error: 'Task transitions are controlled by execution and approval operations.' }, { status: 400 });
    }

    const { data: task, error } = await supabase.from("tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", taskId).eq("created_by", user.id).select("id").maybeSingle();
    if (error) throw error;
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json({ success: true, taskId, status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    // Foreign-key cascades remove dependent rows only after the authorized delete.
    const { data: task, error } = await supabase.from("tasks").delete()
      .eq("id", taskId).eq("created_by", user.id).select("id").maybeSingle();
    if (error) throw error;
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json({ success: true, taskId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete task" }, { status: 500 });
  }
}
