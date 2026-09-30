import { createClient } from "@/utils/supabase/server";
import { queryDirectDb } from "@/utils/direct-db";
import { requireTenant, RequestError } from "@/utils/tenant-context";
import { serverTelemetry } from "@/utils/server-telemetry";
import { issueEnrollment } from "@/utils/device-ingestion";
import { DeviceError } from "../../../../backend/src/services/device-protocol";
import { agentReleaseConfiguration } from "../../../../backend/src/services/agent-installer";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CloudRecoveryBridge,
  ServerAccessManager,
  ServerClassifier,
} from "@ryvix/services";
import { requireProjectOperator, operationAuthorization } from "@/utils/operation-access";
import type { SupportedCloudProvider } from "@ryvix/services";

export async function GET() {
  try {
    const { organizationId, user } = await requireTenant();
    const rows = await queryDirectDb(
      `SELECT s.id, s.hostname, s.ip_address, s.os_type, s.cloud_provider, s.status,
              c.last_heartbeat_at, t.bucket_timestamp, t.cpu_avg, t.ram_percent, t.disk_used_percent,
              COALESCE((SELECT json_agg(json_build_object('name', svc.service_name,
                'status', svc.status, 'lastSeenAt', svc.last_seen_at))
                FROM services_inventory svc WHERE svc.server_id = s.id), '[]') AS services
       FROM servers s
       JOIN environments e ON e.id = s.environment_id
       JOIN projects p ON p.id = e.project_id
       JOIN organization_members m ON m.organization_id = p.organization_id AND m.user_id = $2
       LEFT JOIN connectors c ON c.id = s.connector_id AND c.environment_id = s.environment_id
       LEFT JOIN LATERAL (SELECT last_sample_at AS bucket_timestamp, cpu_avg, ram_percent, disk_used_percent
         FROM telemetry_metric_rollups WHERE server_id = s.id AND authenticated=true
         ORDER BY bucket_timestamp DESC LIMIT 1) t ON true
       WHERE p.organization_id = $1 ORDER BY s.hostname, s.created_at DESC`,
      [organizationId, user.id],
    );
    const now = Date.now();
    const servers = rows.map((row) => {
      const telemetry = serverTelemetry(row, now);
      return {
        id: row.id, hostname: row.hostname, ip: row.ip_address ?? null,
        os: row.os_type ?? null, provider: row.cloud_provider ?? null,
        status: telemetry.telemetryStatus !== 'fresh' ? 'unknown'
          : ['warning', 'critical'].includes(row.status) ? 'degraded'
          : ['healthy', 'unreachable'].includes(row.status) ? row.status : 'unknown',
        lastHeartbeat: row.last_heartbeat_at ?? null, services: row.services,
        ...telemetry,
      };
    });
    return NextResponse.json({ success: true, servers, count: servers.length, source: 'telemetry_metric_rollups' },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false,
      error: error instanceof RequestError ? error.message : 'Server telemetry unavailable.' },
      { status: error instanceof RequestError ? error.status : 503 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient(await cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { action, serverId, environmentId, capability, params } = body;

    // Action A: Real single-line agent enrollment script
    if (action === "generate_enrollment") {
      const tenant = await requireTenant();
      const { origin } = agentReleaseConfiguration();
      const enrollment = await issueEnrollment({ organizationId: tenant.organizationId, userId: tenant.user.id }, environmentId, body.hostname);
      return NextResponse.json({ success: true, ...enrollment, installScript: `curl --proto '=https' --tlsv1.2 -fsS '${origin}/api/install' | sudo bash` },
        { headers: { 'Cache-Control': 'no-store' } });
    }

    // A simulated local agent must never stand in for an enrolled device command.
    if (action === "execute_capability") {
      return NextResponse.json({ success: false, error: "Remote command delivery and persisted approval are not configured. No operation was performed." }, { status: 503 });
    }
    // Action C: Real out-of-band cloud recovery reboot
    if (action === "oob_cloud_reboot") {
      if (body.approved !== true || !serverId) return NextResponse.json({ success: false, error: "Server ID and explicit approval required" }, { status: 400 });
      const { data: server, error } = await supabase.from("servers").select("id, environment_id, cloud_provider, cloud_instance_id").eq("id", serverId).maybeSingle();
      if (error || !server) return NextResponse.json({ success: false, error: "Server not found" }, { status: 404 });
      const { data: environment } = await supabase.from("environments").select("project_id").eq("id", server.environment_id).maybeSingle();
      if (!environment) return NextResponse.json({ success: false, error: "Server project not found" }, { status: 403 });
      const role = await requireProjectOperator(supabase, user.id, environment.project_id);
      if (!["owner", "admin"].includes(role)) return NextResponse.json({ success: false, error: "Administrator approval required" }, { status: 403 });
      if (!server.cloud_provider || !server.cloud_instance_id) return NextResponse.json({ success: false, error: "Server has no configured cloud resource" }, { status: 400 });
      // Operator-managed allowlist prevents customer-supplied enrollment metadata from targeting other accounts.
      const allowed = (process.env.RYVIX_CLOUD_TARGETS || "").split(",");
      if (!allowed.includes(`${server.id}:${server.cloud_provider}:${server.cloud_instance_id}`)) return NextResponse.json({ success: false, error: "Cloud resource is not enabled for recovery" }, { status: 403 });
      const bridge = new CloudRecoveryBridge();
      const result = await bridge.executePowerAction(
        server.cloud_provider as SupportedCloudProvider,
        server.cloud_instance_id,
        "hard_reset",
        operationAuthorization(supabase, user.id, environment.project_id)
      );

      return NextResponse.json({
        success: true,
        result,
      }, { status: result.status === "dispatched" ? 202 : 200 });
    }

    if (action === "diagnose_threat_neural") {
      return NextResponse.json({ success: false, error: "Use authenticated chat diagnostics to inspect measured server data. No threat diagnosis was fabricated." }, { status: 422 });
    }
    // Action E: Real Ed25519 SSH Keypair Generation
    if (action === "generate_ssh_keypair") {
      const keypair = ServerAccessManager.generateSshKeypair(
        params?.label || "ryvix-automation"
      );
      return NextResponse.json({
        success: true,
        keypair,
      });
    }

    // Action F: Real AI Connection Error Diagnosis
    if (action === "diagnose_access_error") {
      const diagnosis = ServerAccessManager.diagnoseAccessError(
        params?.accessType || "SSH_CREDENTIAL",
        params?.errorOutput || "",
        params?.context
      );
      return NextResponse.json({
        success: true,
        diagnosis,
      });
    }

    // Action G: Real Server Archetype Classification
    if (action === "inspect_server_archetype_modules") {
      const features = ServerClassifier.classify(params || {});
      return NextResponse.json({
        success: true,
        features,
      });
    }

    if (action === "create_server") {
      return NextResponse.json({ success: false, error: "Use single-use enrollment to connect and verify a real server." }, { status: 422 });
    }
    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof DeviceError || err instanceof RequestError ? err.message : 'Server operation unavailable.' },
      { status: err instanceof DeviceError || err instanceof RequestError ? err.status : 503 });
  }
}
