import { NextRequest, NextResponse } from "next/server";
import { dockerWorkspaceManager } from "@ryvix/services";
import { queryDirectDb } from "@/utils/direct-db";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: true,
        count: 0,
        sessions: [],
        summary: {
          activeCount: 0,
          defaultPortRange: "3100-3999",
          cgroupLimitCpu: 2,
          cgroupLimitRamMb: 2048,
          isolationNetwork: "bridge",
        },
      });
    }

    // Resolve user's organization projects to maintain complete tenant isolation
    const profileRes = await queryDirectDb<{ organization_id: string }>(
      `SELECT organization_id FROM profiles WHERE id = $1`,
      [user.id]
    );
    const userOrgId = profileRes[0]?.organization_id;

    if (!userOrgId) {
      return NextResponse.json({
        success: true,
        count: 0,
        sessions: [],
        summary: {
          activeCount: 0,
          defaultPortRange: "3100-3999",
          cgroupLimitCpu: 2,
          cgroupLimitRamMb: 2048,
          isolationNetwork: "bridge",
        },
      });
    }

    const projects = await queryDirectDb<{ id: string }>(
      `SELECT id FROM projects WHERE organization_id = $1`,
      [userOrgId]
    );
    const projectIds = projects.map((p) => p.id);

    if (projectIds.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        sessions: [],
        summary: {
          activeCount: 0,
          defaultPortRange: "3100-3999",
          cgroupLimitCpu: 2,
          cgroupLimitRamMb: 2048,
          isolationNetwork: "bridge",
        },
      });
    }

    // Auto-mark expired sessions as destroyed in DB
    await queryDirectDb(
      `UPDATE workspace_sessions SET status = 'destroyed' WHERE expires_at < NOW() AND status IN ('active', 'executing', 'provisioning')`
    );

    // Query active non-expired DB sessions belonging to this user's organization projects
    const dbSessions = await queryDirectDb(`
      SELECT id, task_id, project_id, container_id, status, preview_url, preview_port, allocated_cpu, allocated_ram_mb, created_at, expires_at
      FROM workspace_sessions
      WHERE project_id = ANY($1) AND expires_at > NOW() AND status IN ('active', 'executing')
      ORDER BY created_at DESC
      LIMIT 10
    `, [projectIds]);

    const memorySessions = dockerWorkspaceManager
      .listSessions()
      .filter((m: any) => projectIds.includes(m.project_id || m.projectId) && (m.status === "active" || m.status === "executing"));

    const sessions = [
      ...memorySessions,
      ...dbSessions.filter((d: any) => !memorySessions.some((m: any) => m.id === d.id)),
    ];

    return NextResponse.json({
      success: true,
      count: sessions.length,
      sessions,
      summary: {
        activeCount: sessions.length,
        defaultPortRange: "3100-3999",
        cgroupLimitCpu: 2,
        cgroupLimitRamMb: 2048,
        isolationNetwork: "bridge",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
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
      const execResult = await dockerWorkspaceManager.executeCommand(
        body.sessionId || "default",
        command
      );
      return NextResponse.json({ success: true, result: execResult });
    }

    // Resolve user's actual project ID
    let resolvedProjectId = projectId;
    if (!resolvedProjectId) {
      const profileRes = await queryDirectDb<{ organization_id: string }>(
        `SELECT organization_id FROM profiles WHERE id = $1`,
        [user.id]
      );
      const userOrgId = profileRes[0]?.organization_id;
      if (userOrgId) {
        const projs = await queryDirectDb<{ id: string }>(
          `SELECT id FROM projects WHERE organization_id = $1 LIMIT 1`,
          [userOrgId]
        );
        resolvedProjectId = projs[0]?.id;
      }
    }

    const session = await dockerWorkspaceManager.createSession({
      taskId: taskId || `task_${Date.now()}`,
      projectId: resolvedProjectId || `proj_${Date.now()}`,
      cpu: 2,
      ramMb: 2048,
      ttlMinutes: 15,
    });

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
