import assert from 'node:assert/strict';
import { ExternalMonitoringService } from '../services/src/monitoring/external-monitor';
import type { Server } from '@ryvix/database';

export async function testServerOutage() {
  console.log('[TEST] Running End-to-End Server Outage & Differential Diagnosis Test...');

  const monitor = new ExternalMonitoringService(90); // 90-second threshold
  const baseTime = new Date('2026-09-21T12:00:00Z');

  const testServer: Server = {
    id: 'srv_prod_01',
    environment_id: 'env_prod_01',
    connector_id: 'conn_agent_01',
    hostname: 'web-prod-app-01.ryvix.internal',
    ip_address: '10.0.1.15',
    os_type: 'ubuntu_22_04',
    kernel_version: '5.15.0',
    cpu_cores: 4,
    ram_mb: 8192,
    disk_gb: 100,
    cloud_provider: 'aws',
    cloud_instance_id: 'i-0abcdef1234567890',
    status: 'healthy',
    created_at: baseTime.toISOString(),
    updated_at: baseTime.toISOString(),
  };

  // Case 1: Healthy (Heartbeat fresh + external probe reachable)
  const freshHeartbeat = new Date('2026-09-21T12:00:30Z').toISOString();
  const evaluationHealthy = monitor.evaluateServerHealth(
    testServer,
    freshHeartbeat,
    'org_ryvix_demo',
    'proj_api',
    { isReachable: true, latencyMs: 45, statusCode: 200 },
    new Date('2026-09-21T12:01:00Z') // 30s elapsed (< 90s threshold)
  );
  assert.equal(evaluationHealthy.diagnosis, 'healthy', 'Server with fresh heartbeat and probe should be healthy');
  assert.equal(evaluationHealthy.incidentCreated, undefined, 'No incident should be created when healthy');

  // Case 2: Agent Crashed (Heartbeat stale + external probe reachable)
  const staleHeartbeat = new Date('2026-09-21T12:00:00Z').toISOString();
  const evaluationAgentCrashed = monitor.evaluateServerHealth(
    testServer,
    staleHeartbeat,
    'org_ryvix_demo',
    'proj_api',
    { isReachable: true, latencyMs: 50, statusCode: 200 },
    new Date('2026-09-21T12:03:00Z') // 180s elapsed (> 90s threshold)
  );
  assert.equal(evaluationAgentCrashed.diagnosis, 'agent_service_crashed');
  assert.equal(evaluationAgentCrashed.incidentCreated?.severity, 'P2_high');
  assert.equal(evaluationAgentCrashed.newStatus, 'unreachable');

  // Case 3: Complete Server Outage (Heartbeat stale + external probe failed)
  const evaluationTotalOutage = monitor.evaluateServerHealth(
    testServer,
    staleHeartbeat,
    'org_ryvix_demo',
    'proj_api',
    { isReachable: false, latencyMs: 5000, error: 'Connection refused' },
    new Date('2026-09-21T12:03:00Z')
  );
  assert.equal(evaluationTotalOutage.diagnosis, 'complete_server_outage');
  assert.equal(evaluationTotalOutage.incidentCreated?.severity, 'P1_critical');
  assert.equal(evaluationTotalOutage.incidentCreated?.status, 'open');
  assert.equal(evaluationTotalOutage.notificationDispatched?.channel, 'whatsapp', 'P1 alerts must dispatch via WhatsApp');
  assert.ok(evaluationTotalOutage.notificationDispatched?.idempotency_key, 'Notification must contain idempotency key');
  assert.equal(evaluationTotalOutage.auditEvent?.action_name, 'incident.created');

  console.log('✓ End-to-End Server Outage Test PASSED (differential diagnosis, incident creation, idempotency, audit trail).');
}
