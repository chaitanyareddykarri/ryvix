/**
 * Ryvix External Server Monitoring & Outage Detection Service
 * 
 * ARCHITECTURAL INVARIANT:
 * Internal server agents cannot report their own host crashes.
 * This service runs independently from Ryvix edge workers, checking both:
 * 1. Internal agent heartbeat recency (`lastHeartbeatAt`)
 * 2. External reachability probes (`health_checks.endpoint_url`)
 * 
 * Differential Diagnosis:
 * - Heartbeat Stopped + External Probe UP   => agent_service_crashed (P2_high)
 * - Heartbeat Stopped + External Probe DOWN => complete_server_outage (P1_critical)
 */

import type {
  Server,
  Incident,
  Notification,
  AuditEvent,
  IncidentSeverity,
} from '@ryvix/database';

export interface ProbeResult {
  isReachable: boolean;
  statusCode?: number;
  latencyMs: number;
  error?: string;
}

export interface OutageEvaluationResult {
  serverId: string;
  previousStatus: string;
  newStatus: string;
  diagnosis: 'healthy' | 'agent_service_crashed' | 'complete_server_outage';
  incidentCreated?: Incident;
  notificationDispatched?: Notification;
  auditEvent?: AuditEvent;
}

export class ExternalMonitoringService {
  private heartbeatThresholdSeconds: number;

  constructor(heartbeatThresholdSeconds = 90) {
    this.heartbeatThresholdSeconds = heartbeatThresholdSeconds;
  }

  /**
   * Performs an independent external HTTP/TCP probe against a server's health endpoint.
   */
  async probeEndpoint(endpointUrl: string): Promise<ProbeResult> {
    const startTime = Date.now();
    try {
      const response = await fetch(endpointUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return {
        isReachable: response.ok,
        statusCode: response.status,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      return {
        isReachable: false,
        latencyMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : 'Connection timeout / network unreachable',
      };
    }
  }

  /**
   * Evaluates server health by correlating internal agent heartbeat and external probe.
   */
  evaluateServerHealth(
    server: Server,
    lastHeartbeatAt: string,
    organizationId: string,
    projectId: string,
    externalProbe: ProbeResult,
    currentTime: Date = new Date()
  ): OutageEvaluationResult {
    const lastHeartbeat = new Date(lastHeartbeatAt);
    const elapsedSeconds = (currentTime.getTime() - lastHeartbeat.getTime()) / 1000;
    const isHeartbeatStale = elapsedSeconds > this.heartbeatThresholdSeconds;

    if (!isHeartbeatStale && externalProbe.isReachable) {
      return {
        serverId: server.id,
        previousStatus: server.status,
        newStatus: 'healthy',
        diagnosis: 'healthy',
      };
    }

    // Differential Diagnosis Logic
    let diagnosis: 'agent_service_crashed' | 'complete_server_outage';
    let severity: IncidentSeverity;
    let incidentTitle: string;
    let incidentType: 'service_crash' | 'unreachable_host';

    if (isHeartbeatStale && externalProbe.isReachable) {
      diagnosis = 'agent_service_crashed';
      severity = 'P2_high';
      incidentType = 'service_crash';
      incidentTitle = `Internal Agent Service Unreachable on ${server.hostname}`;
    } else {
      diagnosis = 'complete_server_outage';
      severity = 'P1_critical';
      incidentType = 'unreachable_host';
      incidentTitle = `CRITICAL: Server Outage Detected for ${server.hostname}`;
    }

    // Build Incident Record
    const incident: Incident = {
      id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      environment_id: server.environment_id,
      server_id: server.id,
      title: incidentTitle,
      incident_type: incidentType,
      severity,
      status: 'open',
      ai_diagnosis: `Automated detection: ${diagnosis}. Last heartbeat was ${elapsedSeconds.toFixed(1)}s ago. External probe reachable: ${externalProbe.isReachable}. Latency: ${externalProbe.latencyMs}ms.`,
      root_cause: null,
      created_at: currentTime.toISOString(),
      resolved_at: null,
    };

    // Build Notification with Idempotency Key
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      organization_id: organizationId,
      recipient_id: 'ops_oncall',
      channel: severity === 'P1_critical' ? 'whatsapp' : 'gmail',
      notification_type: 'incident_alert',
      title: `[RYVIX ALERT] ${incidentTitle}`,
      body: incident.ai_diagnosis || '',
      status: 'queued',
      external_message_id: null,
      idempotency_key: `alert_${server.id}_${diagnosis}_${Math.floor(currentTime.getTime() / 300000)}`,
      created_at: currentTime.toISOString(),
      sent_at: null,
    };

    // Build Immutable Audit Event
    const auditEvent: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: currentTime.toISOString(),
      organization_id: organizationId,
      project_id: projectId,
      actor_id: 'system_monitor',
      actor_type: 'system',
      action_name: 'incident.created',
      target_entity: 'server',
      target_id: server.id,
      parameters_hash: 'sha256_hash_eval',
      diff_summary: `Server status transitioned from ${server.status} to unreachable. Incident ${incident.id} created.`,
      status: 'success',
      ip_address: null,
      correlation_id: incident.id,
    };

    return {
      serverId: server.id,
      previousStatus: server.status,
      newStatus: 'unreachable',
      diagnosis,
      incidentCreated: incident,
      notificationDispatched: notification,
      auditEvent,
    };
  }
}
