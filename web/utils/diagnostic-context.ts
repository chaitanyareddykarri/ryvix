import 'server-only';
import { queryDirectDb } from './direct-db';
import { serverTelemetry } from './server-telemetry';
import { SystemTopologyGraph } from '../../ai/src/graph-rag';

/** Only curated, tenant-scoped fields enter model context. No raw logs or credentials. */
export async function diagnosticContext(organizationId: string, userId: string) {
  const args = [organizationId, userId];
  const scope = `JOIN environments e ON e.id=s.environment_id JOIN projects p ON p.id=e.project_id
    JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2`;
  const [servers, health, incidents, security, deploymentAudit, deploymentEvents, services, runtimeObservations] = await Promise.all([
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
    queryDirectDb(`SELECT d.github_deployment_id,d.github_status_id,d.commit_sha,d.environment,d.state,
      d.provider_created_at,d.received_at,r.full_name FROM deployment_events d
      JOIN repositories r ON r.id=d.repository_id JOIN projects p ON p.id=r.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2
      WHERE p.organization_id=$1 ORDER BY d.provider_created_at DESC,d.github_status_id DESC LIMIT 20`, args),
    queryDirectDb(`SELECT si.id,si.server_id,si.service_name,si.status,si.last_seen_at FROM services_inventory si
      JOIN servers s ON s.id=si.server_id ${scope} WHERE p.organization_id=$1 ORDER BY si.last_seen_at DESC LIMIT 100`,args),
    queryDirectDb(`SELECT o.id,o.observed_at,o.reachable,o.status_code,o.latency_ms,d.commit_sha,d.environment,r.full_name
      FROM deployment_runtime_observations o JOIN deployment_events d ON d.id=o.deployment_event_id
      JOIN repositories r ON r.id=d.repository_id JOIN projects p ON p.id=r.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2
      WHERE p.organization_id=$1 ORDER BY o.observed_at DESC LIMIT 20`,args),
  ]);
  const graph=new SystemTopologyGraph(false);
  for(const server of servers)graph.addNode({id:server.id,name:server.hostname,type:'SERVER',status:'UNKNOWN'});
  for(const service of services){
    if(!graph.getNode(service.server_id))continue;
    graph.addNode({id:service.id,name:service.service_name,type:'SERVICE',status:'UNKNOWN'});
    graph.addEdge({source:service.id,target:service.server_id,relation:'HOSTED_ON',metadata:{lastSeen:service.last_seen_at,recordedStatus:service.status}});
  }
  return { observedAt: new Date().toISOString(), servers: servers.map(server => ({ id: server.id,
    hostname: server.hostname, recordedStatus: server.status, lastHeartbeat: server.last_heartbeat_at,
    ...serverTelemetry(server) })), healthChecks: health, incidents, securityEvents: security,
    topology:{summary:graph.formatTopologyContext(),relationships:services.flatMap(service=>graph.getOutboundEdges(service.id)),
      limitation:'Recorded hosting relationships only; no inferred dependencies or current service health.'},
    deployments: { recordsAvailable: deploymentEvents.length > 0, records: deploymentEvents,
      runtimeHealthVerified: false,
      runtimeObservations, runtimeLimitation:'Dated endpoint reachability observations; no proof of the executing commit or whole-application health.',
      explanation: deploymentEvents.length ? 'Verified GitHub provider observations; these do not prove runtime health. Status history may include older states.'
        : 'No verified deployment status events have been received for this organization. Audit actions do not prove deployment success.',
      auditActivity: deploymentAudit } };
}
