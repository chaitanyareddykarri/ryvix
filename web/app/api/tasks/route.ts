import { RepositoryJobStore } from '../../../../backend/src/services/repository-job-store';
import { getDirectDbPool } from '@/utils/direct-db';
import { requireTenant, requireOperator, RequestError } from "@/utils/tenant-context";
import { NextResponse } from "next/server";
import { changeTaskLifecycle } from '@/utils/task-lifecycle';

export async function GET() {
  try {
    const { db, organizationId } = await requireTenant();
    const projects = await db.from("projects").select("id").eq("organization_id", organizationId);
    if (projects.error) throw new Error("Projects unavailable.");
    const ids = (projects.data || []).map(p => p.id);
    if (!ids.length) return NextResponse.json({ tasks: [] });
    const result = await db.from("tasks")
      .select("*, plans:plans!plans_task_id_fkey(*), task_artifacts(*, repositories(id, full_name)), pull_requests(*), workspace_sessions(id,status,preview_url,expires_at)")
      .in("project_id", ids).order("created_at", { ascending: false }).limit(50);
    if (result.error) throw new Error("Tasks unavailable.");
    const tasks = (result.data || []).map(task => {
      const artifact = Array.isArray(task.task_artifacts) ? task.task_artifacts[0] : task.task_artifacts;
      const pr = task.pull_requests?.[0];
      const workspace = task.workspace_sessions?.find((session: any) => session.status === 'active' && session.preview_url && Date.parse(session.expires_at) > Date.now());
      const { task_artifacts: _artifacts, pull_requests: _requests, workspace_sessions: _workspaces, ...safe } = task;
      return { ...safe, result: artifact ? { files: artifact.files, branch: artifact.base_branch,
        baseCommitSha: artifact.base_commit_sha, verification: artifact.verification } : null,
        repository: artifact?.repositories || null,
        workspace: workspace ? { sessionId: workspace.id, previewUrl: `/api/workspace/${workspace.id}/preview`, expiresAt: workspace.expires_at } : null,
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
  try {
    const { user, organizationId, role } = await requireTenant();
    requireOperator(role);
    const body = await request.json().catch(() => ({}));
    if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 10000)
      throw new RequestError('Provide a prompt of at most 10,000 characters.',400);
    if (typeof body.repositoryId !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.repositoryId))
      throw new RequestError('Select a connected repository.',400);
    const task = await new RepositoryJobStore(getDirectDbPool()).enqueue(body.repositoryId,organizationId,user.id,body.prompt.trim());
    return NextResponse.json({ success: true, task: { id: task.id, prompt: task.user_prompt, status: task.status, title: 'Queued for repository analysis' }, steps: [] },
      { status: 202, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const safe = error instanceof Error && /^(Repository access denied|Connect a persisted GitHub|Project task queue)/.test(error.message);
    return NextResponse.json({ error: error instanceof RequestError || safe ? (error as Error).message : 'Task queue unavailable. Please retry.' },
      { status: error instanceof RequestError ? error.status : safe ? 409 : 503 });
  }
}

export async function PATCH(request: Request) {
  return mutateTask(request, 'cancel');
}

export async function DELETE(request: Request) {
  return mutateTask(request, 'delete');
}

async function mutateTask(request: Request, action: 'cancel' | 'delete') {
  try {
    const { user, organizationId, role } = await requireTenant();
    requireOperator(role);
    const body = action === 'cancel' ? await request.json().catch(() => ({})) : null;
    if (body && body.status !== 'cancelled') throw new RequestError('Task transitions are controlled by execution and approval operations.', 400);
    const taskId = body?.taskId ?? new URL(request.url).searchParams.get('taskId');
    if (typeof taskId !== 'string') throw new RequestError('taskId is required.', 400);
    await changeTaskLifecycle(taskId, action, user.id, organizationId);
    return NextResponse.json({ success: true, taskId, ...(action === 'cancel' ? { status: 'cancelled' } : {}) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : 'Task cleanup could not finish. Retry when its workspace worker is available.' },
      { status: error instanceof RequestError ? error.status : 503 });
  }
}
