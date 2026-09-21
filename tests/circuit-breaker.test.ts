import assert from 'node:assert/strict';
import { SelfHealingEngine, CircuitBreakerError } from '../services/src/self-healing/self-healing.engine';
import type { Incident, RecoveryPlan } from '@ryvix/database';

export async function testCircuitBreakerFlow() {
  console.log('[TEST] Running 3-Attempt Circuit Breaker & Anti-Looping Test...');

  const engine = new SelfHealingEngine();
  const now = new Date().toISOString();

  const incident: Incident = {
    id: 'inc_recurring_oom',
    environment_id: 'env_prod_01',
    server_id: 'srv_prod_01',
    title: 'Persistent Out-Of-Memory Crash',
    incident_type: 'resource_exhaustion',
    severity: 'P1_critical',
    status: 'open',
    ai_diagnosis: 'Node API container terminating with Exit Code 137 (OOMKilled)',
    root_cause: 'memory_leak',
    created_at: now,
    resolved_at: null,
  };

  const plan: RecoveryPlan = {
    id: 'plan_oom_restart',
    incident_id: incident.id,
    action_level: 2,
    action_name: 'restart_container',
    parameters: { container: 'api_worker' },
    requires_human_approval: false,
    status: 'approved',
    approved_by: 'ai_policy_engine',
    approved_at: now,
    created_at: now,
  };

  // Attempt 1: Fails
  const res1 = await engine.executeRecoveryRun(
    incident,
    plan,
    'restart_container',
    1,
    'srv_prod_01',
    'proj_api',
    'org_ryvix_demo',
    async () => false // Simulation of restart failing to fix OOM
  );
  assert.equal(res1.run.status, 'failed');
  assert.equal(res1.incidentUpdated.status, 'recovering', 'Incident in recovery after attempt 1');

  // Attempt 2: Fails
  const res2 = await engine.executeRecoveryRun(
    incident,
    plan,
    'restart_container',
    2,
    'srv_prod_01',
    'proj_api',
    'org_ryvix_demo',
    async () => false
  );
  assert.equal(res2.run.status, 'failed');
  assert.equal(res2.incidentUpdated.status, 'recovering', 'Incident in recovery after attempt 2');

  // Attempt 3: Fails -> Trips Circuit Breaker
  const res3 = await engine.executeRecoveryRun(
    incident,
    plan,
    'restart_container',
    3,
    'srv_prod_01',
    'proj_api',
    'org_ryvix_demo',
    async () => false
  );
  assert.equal(res3.run.status, 'failed');
  assert.equal(res3.incidentUpdated.status, 'escalated', '3rd failed attempt must trip circuit breaker and escalate incident');

  // Attempt 4: MUST BE REJECTED BY CIRCUIT BREAKER
  let attempt4Blocked = false;
  try {
    await engine.executeRecoveryRun(
      incident,
      plan,
      'restart_container',
      4,
      'srv_prod_01',
      'proj_api',
      'org_ryvix_demo',
      async () => true
    );
  } catch (err: unknown) {
    if (err instanceof CircuitBreakerError) {
      attempt4Blocked = true;
    }
  }

  assert.equal(attempt4Blocked, true, 'Attempt 4 must be strictly blocked with CircuitBreakerError');
  assert.equal(incident.status, 'escalated', 'Incident remains escalated and halted');

  console.log('✓ 3-Attempt Circuit Breaker Test PASSED (Attempt 1, 2, 3 failure -> circuit breaker tripped -> attempt 4 blocked -> escalated).');
}
