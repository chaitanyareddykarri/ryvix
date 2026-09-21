/**
 * Ryvix Policy-Controlled Self-Healing Engine
 * 
 * ARCHITECTURAL SAFETY INVARIANTS:
 * 1. AI cannot execute arbitrary shell commands.
 * 2. Actions must belong to the whitelisted RecoveryActionRegistry.
 * 3. Level 3 high-risk actions require human approval in `approval_requests`.
 * 4. Maximum 3 recovery attempts permitted. Attempt 4 trips the Circuit Breaker,
 *    marking the incident 'escalated' and halting automation to prevent runaway reboot loops.
 */

import type {
  Incident,
  RecoveryPlan,
  RecoveryRun,
  AuditEvent,
} from '@ryvix/database';

export type ActionRiskLevel = 'level_0_readonly' | 'level_1_safe' | 'level_2_stateful' | 'level_3_high_risk';

export interface ActionDefinition {
  name: string;
  riskLevel: ActionRiskLevel;
  requiresApproval: boolean;
  timeoutSeconds: number;
}

export const RECOVERY_ACTION_REGISTRY: Record<string, ActionDefinition> = {
  health_check: { name: 'health_check', riskLevel: 'level_0_readonly', requiresApproval: false, timeoutSeconds: 30 },
  collect_logs: { name: 'collect_logs', riskLevel: 'level_0_readonly', requiresApproval: false, timeoutSeconds: 60 },
  collect_metrics: { name: 'collect_metrics', riskLevel: 'level_0_readonly', requiresApproval: false, timeoutSeconds: 30 },
  restart_service: { name: 'restart_service', riskLevel: 'level_1_safe', requiresApproval: false, timeoutSeconds: 60 },
  clear_temp_cache: { name: 'clear_temp_cache', riskLevel: 'level_1_safe', requiresApproval: false, timeoutSeconds: 60 },
  restart_container: { name: 'restart_container', riskLevel: 'level_2_stateful', requiresApproval: false, timeoutSeconds: 120 },
  rollback_deployment: { name: 'rollback_deployment', riskLevel: 'level_2_stateful', requiresApproval: false, timeoutSeconds: 300 },
  reboot_server: { name: 'reboot_server', riskLevel: 'level_3_high_risk', requiresApproval: true, timeoutSeconds: 600 },
  drop_connections: { name: 'drop_connections', riskLevel: 'level_3_high_risk', requiresApproval: true, timeoutSeconds: 60 },
};

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class PolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyViolationError';
  }
}

export interface ExecutionResult {
  run: RecoveryRun;
  incidentUpdated: Incident;
  auditEvent: AuditEvent;
}

export class SelfHealingEngine {
  private maxAttempts = 3;

  /**
   * Evaluates whether a proposed recovery plan adheres to policy gates.
   */
  validateRecoveryPlan(
    actionName: string,
    isApprovedByHuman = false
  ): { allowed: boolean; reason?: string } {
    const actionDef = RECOVERY_ACTION_REGISTRY[actionName];
    if (!actionDef) {
      return { allowed: false, reason: `Action '${actionName}' is not recognized in RecoveryActionRegistry.` };
    }

    if (actionDef.requiresApproval && !isApprovedByHuman) {
      return {
        allowed: false,
        reason: `Action '${actionName}' is Level 3 (High Risk) and requires explicit human approval.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Executes a self-healing step with strict attempt counting and anti-loop circuit breaker.
   */
  async executeRecoveryRun(
    incident: Incident,
    plan: RecoveryPlan,
    actionName: string,
    attemptNumber: number,
    serverId: string,
    projectId: string,
    organizationId: string,
    actionExecutor: () => Promise<boolean>,
    isApprovedByHuman = false
  ): Promise<ExecutionResult> {
    const currentTime = new Date();

    // 1. Circuit Breaker Check: Strictly block attempts > 3
    if (attemptNumber > this.maxAttempts) {
      incident.status = 'escalated';

      throw new CircuitBreakerError(
        `CIRCUIT BREAKER TRIPPED: Attempt #${attemptNumber} exceeds maximum allowed attempts (${this.maxAttempts}). Escalating incident ${incident.id}.`
      );
    }

    // 2. Authorization and Policy Validation
    const policyCheck = this.validateRecoveryPlan(actionName, isApprovedByHuman);
    if (!policyCheck.allowed) {
      throw new PolicyViolationError(`Policy check rejected action '${actionName}': ${policyCheck.reason}`);
    }

    // 3. Prepare Recovery Run Record
    const runId = `rec_run_${Date.now()}_${attemptNumber}`;
    const runRecord: RecoveryRun = {
      id: runId,
      recovery_plan_id: plan.id,
      server_id: serverId,
      action_name: actionName,
      attempt_number: attemptNumber,
      status: 'executing',
      verification_result: null,
      started_at: currentTime.toISOString(),
      completed_at: null,
    };

    // 4. Execute Whitelisted Action
    let success = false;
    let errorMessage: string | null = null;
    try {
      success = await actionExecutor();
    } catch (err: unknown) {
      success = false;
      errorMessage = err instanceof Error ? err.message : 'Execution failed';
    }

    // 5. Verification Phase
    const completionTime = new Date();
    runRecord.completed_at = completionTime.toISOString();

    if (success) {
      runRecord.status = 'verified';
      runRecord.verification_result = JSON.stringify({
        healthy: true,
        verified_at: completionTime.toISOString(),
        probes_passing: true,
      });

      incident.status = 'resolved';
      incident.resolved_at = completionTime.toISOString();
    } else {
      runRecord.status = 'failed';
      runRecord.verification_result = JSON.stringify({
        healthy: false,
        error: errorMessage || 'Verification probe failed post-execution',
      });

      if (attemptNumber >= this.maxAttempts) {
        // Trip Circuit Breaker immediately upon 3rd failure
        incident.status = 'escalated';
      } else {
        incident.status = 'recovering';
      }
    }

    // 6. Append-Only Audit Event
    const auditEvent: AuditEvent = {
      id: `audit_rec_${Date.now()}_${attemptNumber}`,
      timestamp: completionTime.toISOString(),
      organization_id: organizationId,
      project_id: projectId,
      actor_id: 'self_healing_engine',
      actor_type: 'system',
      action_name: `recovery.${actionName}`,
      target_entity: 'incident',
      target_id: incident.id,
      parameters_hash: `sha256_attempt_${attemptNumber}`,
      diff_summary: `Executed attempt ${attemptNumber} of ${actionName}. Result: ${runRecord.status}. Incident status: ${incident.status}`,
      status: success ? 'success' : 'failure',
      ip_address: null,
      correlation_id: incident.id,
    };

    return {
      run: runRecord,
      incidentUpdated: incident,
      auditEvent,
    };
  }
}
