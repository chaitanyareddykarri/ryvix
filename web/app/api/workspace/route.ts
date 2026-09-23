import { NextRequest, NextResponse } from "next/server";
import { dockerWorkspaceManager } from "@ryvix/services";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const memorySessions = dockerWorkspaceManager.listSessions();

    // Query DB sessions
    let dbSessions: any[] = [];
    try {
      const { Client } = require("pg");
      const client = new Client({
        connectionString:
          process.env.DATABASE_URL ||
          "postgresql://postgres:CR%24%24Reddy2006@db.tsoyrpgifovzwqtgpkkb.supabase.co:5432/postgres",
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      const res = await client.query(`
        SELECT id, task_id, project_id, container_id, status, preview_url, preview_port, allocated_cpu, allocated_ram_mb, created_at, expires_at
        FROM workspace_sessions
        ORDER BY created_at DESC
        LIMIT 10
      `);
      await client.end();
      dbSessions = res.rows || [];
    } catch (err) {
      console.warn("[Workspace API DB Warning]:", err);
    }

    const sessions = [
      ...memorySessions,
      ...dbSessions.filter((d) => !memorySessions.some((m) => m.id === d.id)),
    ];

    return NextResponse.json({
      success: true,
      count: sessions.length,
      sessions,
      summary: {
        activeCount: sessions.filter((s) => s.status === "active" || s.status === "executing").length,
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
    const body = await req.json().catch(() => ({}));
    const { action, taskId, projectId, command } = body;

    if (action === "execute" && command) {
      const execResult = await dockerWorkspaceManager.executeCommand(
        body.sessionId || "default",
        command
      );
      return NextResponse.json({ success: true, result: execResult });
    }

    const session = await dockerWorkspaceManager.createSession({
      taskId: taskId || `task_${Date.now()}`,
      projectId: projectId || "eadd8016-5d29-40c2-a129-31dc52a2403e",
      cpu: 2,
      ramMb: 2048,
      ttlMinutes: 15,
    });

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
