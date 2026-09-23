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
      sourceIp,
      metrics,
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

    // 2. Insert Telemetry Metric Rollup matching exact schema
    if (metrics && serverId) {
      const cpuPercent = metrics.cpuUsagePercent ?? metrics.cpuPercent ?? 15;
      const memPercent = metrics.memoryUsagePercent ?? metrics.memPercent ?? 45;
      const diskPercent = metrics.diskUsagePercent ?? metrics.diskPercent ?? 30;
      const ramUsedMb = metrics.memoryUsedMb ?? Math.round(memPercent * 81.92);

      await supabase.from("telemetry_metric_rollups").insert({
        server_id: serverId,
        bucket_timestamp: nowIso,
        cpu_avg: cpuPercent,
        cpu_max: cpuPercent,
        ram_used_mb: ramUsedMb,
        ram_percent: memPercent,
        disk_used_percent: diskPercent,
      });

      // 3. Security Engine Threat Analysis
      const securityAnalysis = LocalSecurityEngine.analyze({
        serverId: serverId,
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

      // If threat is high or critical, log into public.security_events matching exact schema
      if (securityAnalysis.severity === "high" || securityAnalysis.severity === "critical") {
        await supabase.from("security_events").insert({
          server_id: serverId,
          event_type: securityAnalysis.threatType || "anomaly_detected",
          severity: securityAnalysis.severity,
          source_ip: sourceIp || "198.51.100.99",
          raw_evidence: {
            confidence: securityAnalysis.confidence,
            diagnosis: securityAnalysis.diagnosis,
            recommendedAction: securityAnalysis.recommendedAction,
            metricsSnapshot: metrics,
          },
          status: "active",
          detected_at: nowIso,
        });
      }
    }

    // 4. Check for Pending Authorized Commands in queue matching exact schema
    let pendingCommands: any[] = [];
    if (connectorId) {
      const { data: commands } = await supabase
        .from("connector_commands")
        .select("id, connector_id, command_name, parameters_hash, payload_encrypted, status")
        .eq("connector_id", connectorId)
        .eq("status", "pending")
        .limit(5);

      if (commands && commands.length > 0) {
        pendingCommands = commands;
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
