import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { LocalSecurityEngine } from "@ryvix/ai";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const {
      serverId,
      connectorId,
      hostname,
      metrics,
      services,
      containers,
      heartbeatSeq,
    } = payload;

    if (!serverId && !connectorId) {
      return NextResponse.json(
        { success: false, error: "Missing serverId or connectorId" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const nowIso = new Date().toISOString();

    // 1. Update Server status & heartbeat
    if (serverId) {
      await supabase
        .from("servers")
        .update({
          status: "healthy",
          updated_at: nowIso,
        })
        .eq("id", serverId);
    }

    // 2. Insert Telemetry Metric Rollup
    if (metrics) {
      const cpuPercent = metrics.cpuUsagePercent ?? metrics.cpuPercent ?? 15;
      const memPercent = metrics.memoryUsagePercent ?? metrics.memPercent ?? 45;
      const diskPercent = metrics.diskUsagePercent ?? metrics.diskPercent ?? 30;

      await supabase.from("telemetry_metric_rollups").insert({
        server_id: serverId || null,
        bucket_timestamp: nowIso,
        cpu_usage_avg: cpuPercent,
        cpu_usage_max: cpuPercent,
        memory_usage_avg: memPercent,
        memory_usage_max: memPercent,
        disk_usage_avg: diskPercent,
        disk_usage_max: diskPercent,
        sample_count: 1,
      });

      // 3. Security Engine Threat Analysis
      const securityAnalysis = LocalSecurityEngine.analyze({
        serverId: serverId || "srv_node",
        hostname: hostname || "customer-node",
        metrics: {
          cpuPercent,
          memPercent,
          diskPercent,
          activeConnections: metrics.activeConnections || 85,
          failedAuthAttempts: metrics.failedAuthAttempts || 0,
        },
        openPorts: [80, 443],
        recentLogs: Array.isArray(payload.recentLogs) ? payload.recentLogs : [],
      });

      // If threat is high or critical, log a security event
      if (securityAnalysis.severity === "high" || securityAnalysis.severity === "critical") {
        await supabase.from("security_events").insert({
          server_id: serverId || null,
          event_type: securityAnalysis.threatType || "anomaly_detected",
          severity: securityAnalysis.severity,
          source: hostname || "customer-connector",
          evidence: {
            confidence: securityAnalysis.confidence,
            diagnosis: securityAnalysis.diagnosis,
            recommendedAction: securityAnalysis.recommendedAction,
            metricsSnapshot: metrics,
          },
          status: "active",
        });
      }
    }

    // 4. Check for Pending Authorized Commands in queue
    let pendingCommands: any[] = [];
    if (connectorId) {
      const { data: commands } = await supabase
        .from("connector_commands")
        .select("*")
        .eq("connector_id", connectorId)
        .eq("status", "pending")
        .limit(5);

      if (commands && commands.length > 0) {
        pendingCommands = commands;
        // Mark as dispatched
        const ids = commands.map((c: any) => c.id);
        await supabase
          .from("connector_commands")
          .update({ status: "dispatched", dispatched_at: nowIso })
          .in("id", ids);
      }
    }

    return NextResponse.json({
      success: true,
      heartbeatAck: true,
      timestamp: nowIso,
      pendingCommands,
    });
  } catch (err: any) {
    console.error("[Connector Telemetry Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process telemetry" },
      { status: 500 }
    );
  }
}
