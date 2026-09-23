import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ExternalMonitoringService } from "@ryvix/services";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serverId, targetUrl } = body;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Fetch server from DB
    let serverRecord: any = null;
    let environmentId: string | null = null;

    if (serverId) {
      const { data } = await supabase.from("servers").select("*").eq("id", serverId).single();
      serverRecord = data;
      environmentId = data?.environment_id;
    }

    if (!environmentId) {
      const { data: envs } = await supabase.from("environments").select("id").limit(1);
      environmentId = envs?.[0]?.id || null;
    }

    const testUrl = targetUrl || (serverRecord?.ip_address ? `http://${serverRecord.ip_address}:80` : "http://localhost:3000/api/servers");
    const monitor = new ExternalMonitoringService(90);

    // 2. Perform external HTTP reachability probe
    const probe = await monitor.probeEndpoint(testUrl);

    // 3. Correlate with internal heartbeat
    const lastHeartbeat = serverRecord?.updated_at || new Date().toISOString();
    const mockServerObj: any = {
      id: serverId || "srv_probe_01",
      hostname: serverRecord?.hostname || "web-edge-node",
      status: serverRecord?.status || "healthy",
      environment_id: environmentId || "env_default",
      ip_address: serverRecord?.ip_address || "127.0.0.1",
      created_at: serverRecord?.created_at || new Date().toISOString(),
      updated_at: lastHeartbeat,
    };

    const evaluation = monitor.evaluateServerHealth(
      mockServerObj,
      lastHeartbeat,
      "org_default",
      "proj_default",
      probe,
      new Date()
    );

    // 4. Log into public.health_checks table matching exact schema
    if (environmentId) {
      await supabase.from("health_checks").insert({
        environment_id: environmentId,
        name: `HTTP Probe - ${serverRecord?.hostname || "web-node"}`,
        check_type: "http",
        target_url_or_ip: testUrl,
        interval_seconds: 60,
        status: probe.isReachable ? "healthy" : "unhealthy",
        last_latency_ms: Math.round(probe.latencyMs),
        consecutive_failures: probe.isReachable ? 0 : 1,
        last_checked_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      probe,
      evaluation: {
        diagnosis: evaluation.diagnosis,
        status: evaluation.newStatus,
        previousStatus: evaluation.previousStatus,
        explanation:
          evaluation.diagnosis === "healthy"
            ? "Server host and internal connector are both responsive and nominal."
            : evaluation.diagnosis === "agent_service_crashed"
            ? "External application is responding, but internal Ryvix agent daemon has stopped emitting heartbeats."
            : "Complete Server Outage detected: Neither external HTTP probes nor internal agent telemetry are responding.",
      },
    });
  } catch (err: any) {
    console.error("[Health Probe Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute health probe" },
      { status: 500 }
    );
  }
}
