import { requireTenant, RequestError } from '@/utils/tenant-context';
import { NextResponse } from "next/server";
import { queryDirectDb } from "@/utils/direct-db";

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
export async function POST(req: Request) {
  try {
    await requireTenant();
    const body = await req.json().catch(() => ({}));
    if (body.action === 'execute') {
      return NextResponse.json({ success: false,
        error: 'Direct workspace commands are unavailable. Submit work through the repository task worker.' }, { status: 503 });
    }
    return NextResponse.json({ success: false,
      error: 'Create a task with a connected repository to provision its sandbox.' }, { status: 422 });
  } catch (error) {
    return NextResponse.json({ success: false,
      error: error instanceof RequestError ? error.message : 'Workspace operation unavailable.' },
    { status: error instanceof RequestError ? error.status : 503 });
  }
}
