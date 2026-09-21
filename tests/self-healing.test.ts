import assert from 'node:assert/strict';
import { SelfHealingEngine } from '../services/src/self-healing/self-healing.engine';
import type { Incident, RecoveryPlan } from '@ryvix/database';

export async function testSelfHealingFlow() {
  console.log('[TEST] Running End-to-End Self-Healing Flow Test...');

  const engine = new SelfHealingEngine();
  const now = new Date().toISOString();

  // 1. Existing incident created by monitoring detection
  const incident: Incident = {
    id: 'inc_web_502',
    environment_id: 'env_prod_01',
    server_id: 'srv_prod_01',
    title: 'Nginx 502 Bad Gateway - Node API Unreachable',
    incident_type: 'service_crash',
    severity: 'P2_high',
    status: 'open',
    ai_diagnosis: 'Upstream Node.js process crashed due to unhandled promise rejection. Process port 3000 down.',
    root_cause: 'process_crash',
    created_at: now,
    resolved_at: null,
  };

  // 2. Structured Recovery Plan generated from AI diagnosis
  const recoveryPlan: RecoveryPlan = {
    id: 'plan_rec_nginx_502',
    incident_id: incident.id,
    action_level: 1, // Safe remediation
    action_name: 'restart_service',
    parameters: { service_name: 'ryvix-backend' },
    requires_human_approval: false,
    status: 'approved',
    approved_by: 'ai_policy_engine',
    approved_at: now,
    created_at: now,
  };

  // 3. Authorization check
  const authCheck = engine.validateRecoveryPlan('restart_service', false);
  assert.equal(authCheck.allowed, true, 'restart_service is Level 1 safe and allowed without human approval');

  // Unauthorized action check (arbitrary or high risk without approval)
  const badActionCheck = engine.validateRecoveryPlan('reboot_server', false);
  assert.equal(badActionCheck.allowed, false, 'reboot_server is Level 3 and must be blocked without human approval');

  // 4. Execute Remediation & Post-Action Verification
  let serviceRestarted = false;
  const executionResult = await engine.executeRecoveryRun(
    incident,
    recoveryPlan,
    'restart_service',
    1, // Attempt 1
    'srv_prod_01',
    'proj_api',
    'org_ryvix_demo',
    async () => {
      // Mock restarting systemd service and verifying port 3000
      serviceRestarted = true;
      return true; // Health probe succeeds
    },
    false
  );

  assert.equal(serviceRestarted, true, 'Action executor must have run');
  assert.equal(executionResult.run.status, 'verified', 'Run must transition to verified upon successful probe');
  assert.equal(executionResult.incidentUpdated.status, 'resolved', 'Incident must transition to resolved');
  assert.ok(executionResult.incidentUpdated.resolved_at, 'Resolved timestamp must be populated');
  assert.equal(executionResult.auditEvent.action_name, 'recovery.restart_service');
  assert.equal(executionResult.auditEvent.status, 'success');

  console.log('✓ End-to-End Self-Healing Flow Test PASSED (plan validation, authorization gate, execution, verification, resolution, audit).');
}
