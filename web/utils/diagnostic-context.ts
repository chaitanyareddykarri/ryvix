import 'server-only';
import { queryDirectDb } from './direct-db';
import { serverTelemetry } from './server-telemetry';

/** Only curated, tenant-scoped fields enter model context. No raw logs or credentials. */
export async function diagnosticContext(organizationId: string, userId: string) {
  const args = [organizationId, userId];
  const scope = `JOIN environments e ON e.id=s.environment_id JOIN projects p ON p.id=e.project_id
    JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2`;
  const [servers, health, incidents, security, deploymentAudit] = await Promise.all([
    queryDirectDb(`SELECT s.id,s.hostname,s.status,c.last_heartbeat_at,t.last_sample_at AS bucket_timestamp,
      t.cpu_avg,t.ram_percent,t.disk_used_percent FROM servers s ${scope}
      LEFT JOIN connectors c ON c.id=s.connector_id AND c.environment_id=s.environment_id
      LEFT JOIN LATERAL (SELECT * FROM telemetry_metric_rollups WHERE server_id=s.id AND authenticated=true
        ORDER BY last_sample_at DESC LIMIT 1) t ON true WHERE p.organization_id=$1 LIMIT 100`, args),
    queryDirectDb(`SELECT h.id,h.name,h.status,h.last_checked_at,h.last_latency_ms FROM health_checks h
      JOIN environments e ON e.id=h.environment_id JOIN projects p ON p.id=e.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2
      WHERE p.organization_id=$1 ORDER BY h.last_checked_at DESC NULLS LAST LIMIT 100`, args),
    queryDirectDb(`SELECT i.id,i.title,i.severity,i.status,i.created_at FROM incidents i
      JOIN environments e ON e.id=i.environment_id JOIN projects p ON p.id=e.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2
      WHERE p.organization_id=$1 ORDER BY i.created_at DESC LIMIT 30`, args),
    queryDirectDb(`SELECT se.id,se.server_id,se.event_type,se.severity,se.status,se.detected_at FROM security_events se
      JOIN servers s ON s.id=se.server_id ${scope} WHERE p.organization_id=$1 ORDER BY se.detected_at DESC LIMIT 30`, args),
    queryDirectDb(`SELECT a.id,a.action_name,a.status,a.timestamp FROM audit_events a JOIN projects p ON p.id=a.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2
      WHERE p.organization_id=$1 AND (a.action_name LIKE 'deployment.%' OR a.action_name LIKE 'deploy.%')
      ORDER BY a.timestamp DESC LIMIT 10`, args),
  ]);
  return { observedAt: new Date().toISOString(), servers: servers.map(server => ({ id: server.id,
    hostname: server.hostname, recordedStatus: server.status, lastHeartbeat: server.last_heartbeat_at,
    ...serverTelemetry(server) })), healthChecks: health, incidents, securityEvents: security,
    deployments: { recordsAvailable: false, explanation: 'No persisted deployment result integration is configured. Audit actions do not prove deployment success.',
      auditActivity: deploymentAudit } };
}
