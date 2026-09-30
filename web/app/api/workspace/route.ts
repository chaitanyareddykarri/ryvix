import { requireTenant, RequestError } from '@/utils/tenant-context';
import { NextRequest, NextResponse } from "next/server";
import { dockerWorkspaceManager } from "@ryvix/services";
import { queryDirectDb } from "@/utils/direct-db";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { requireProjectOperator, operationAuthorization } from "@/utils/operation-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user, organizationId } = await requireTenant();
    const rows = await queryDirectDb(`SELECT w.id,w.task_id,w.project_id,w.status,w.preview_url,w.expires_at,w.created_at,w.allocated_cpu,w.allocated_ram_mb
      FROM workspace_sessions w JOIN projects p ON p.id=w.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2
      WHERE p.organization_id=$1 AND w.expires_at>now() AND w.status IN ('active','executing')
      ORDER BY w.created_at DESC LIMIT 50`, [organizationId,user.id]);
    const sessions = rows.map(row => ({ ...row, preview_url: row.preview_url ? `/api/workspace/${row.id}/preview` : null }));
    return NextResponse.json({ success: true, count: sessions.length, sessions, summary: { activeCount: sessions.length } },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof RequestError ? error.message : 'Workspaces unavailable.' },
      { status: error instanceof RequestError ? error.status : 503 });
  }
}
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, taskId, projectId, command } = body;

    if (action === "execute" && command) {
      const session = dockerWorkspaceManager.getSession(body.sessionId);
      if (!session) return NextResponse.json({ success: false, error: "Workspace not found on this worker" }, { status: 404 });
      await requireProjectOperator(supabase, user.id, session.project_id);
      const audit = operationAuthorization(supabase, user.id, session.project_id);
      await audit.recordAudit({ action: "workspace.execute", target: session.id, status: "requested" });
      const execResult = await dockerWorkspaceManager.executeCommand(
        session.id,
        command
      );
      await audit.recordAudit({ action: "workspace.execute", target: session.id, status: execResult.success ? "success" : "failure", detail: `exit=${execResult.exitCode}` });
      return NextResponse.json({ success: execResult.success, result: execResult });
    }

    return NextResponse.json({ success: false, error: "Create a task with a connected repository to provision its sandbox." }, { status: 422 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
