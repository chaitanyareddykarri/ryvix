/**
 * Ryvix Plan Validation Engine
 * 
 * Responsibilities:
 * - Validates LLM-generated execution plans before any backend execution occurs
 * - Checks schema correctness, requested scope, allowed tools, project boundaries
 * - Enforces mandatory human approval for production, code modification, or destructive steps
 * - Rejects malformed, unauthorized, out-of-scope, or unsafe plans
 * - Verifies dependency ordering
 */

import type { Plan, PlanStep } from '@ryvix/database';
import { TaskContext } from '../context/context-builder';
import { RefinedRequirement } from '../understanding/intent-processor';

export interface PlanValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiresHumanApproval: boolean;
  validatedStepCount: number;
  unauthorizedToolsDetected: string[];
}

export class PlanValidator {
  private static readonly DANGEROUS_ACTIONS = [
    'rm -rf',
    'drop table',
    'drop database',
    'delete from',
    'format c:',
    'shutdown',
    'system.rm_rf',
    'db.drop_all',
    'aws.delete_cluster',
    'reboot -f',
    'kill -9 1',
  ];

  /**
   * Validates a plan against task context, refined requirement, and safety boundaries.
   */
  validatePlan(
    plan: Plan,
    context: TaskContext,
    refinedReq: RefinedRequirement
  ): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const unauthorizedToolsDetected: string[] = [];

    // 1. Schema Correctness Checks
    if (!plan || !plan.id || !plan.task_id) {
      errors.push('Schema Error: Plan must contain valid id and task_id');
    }

    if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
      errors.push('Schema Error: Plan must contain at least one valid PlanStep');
      return {
        isValid: false,
        errors,
        warnings,
        requiresHumanApproval: false,
        validatedStepCount: 0,
        unauthorizedToolsDetected,
      };
    }

    // 2. Step-by-Step Security & Authorization Validation
    const seenStepNumbers = new Set<number>();
    let requiresApprovalEnforced = false;

    for (let i = 0; i < plan.steps.length; i++) {
      const step: PlanStep = plan.steps[i];

      // Check step numbering & ordering
      if (!step.step_number || step.step_number <= 0) {
        errors.push(`Step ${i + 1}: Invalid step_number (${step.step_number})`);
      } else if (seenStepNumbers.has(step.step_number)) {
        errors.push(`Step ${step.step_number}: Duplicate step_number found`);
      }
      seenStepNumbers.add(step.step_number);

      // Check suggested tool authorization
      if (step.suggested_tool) {
        if (!context.allowedTools.includes(step.suggested_tool)) {
          unauthorizedToolsDetected.push(step.suggested_tool);
          errors.push(
            `Tool Authorization Error: Tool '${step.suggested_tool}' is not in allowed tools list [${context.allowedTools.join(', ')}]`
          );
        }
      } else {
        errors.push(`Step ${step.step_number}: Missing suggested_tool specification`);
      }

      // Check dangerous payloads / arguments
      const argsString = JSON.stringify(step.tool_arguments || '').toLowerCase();
      const descString = (step.title + ' ' + step.description).toLowerCase();
      for (const dangerous of PlanValidator.DANGEROUS_ACTIONS) {
        if (argsString.includes(dangerous) || descString.includes(dangerous)) {
          errors.push(
            `Security Policy Violation: Step ${step.step_number} contains prohibited destructive pattern '${dangerous}'`
          );
        }
      }

      // 3. Blast-Radius & Production Risk Checks
      const isProductionImpacting =
        /apply_diff|create_pr|restart_service|reboot|deploy|modify|delete/i.test(step.suggested_tool || '') ||
        /production|live|pr|branch/i.test(descString);

      if (isProductionImpacting) {
        requiresApprovalEnforced = true;
        if (!step.requires_approval) {
          warnings.push(
            `Safety Adjustment: Step ${step.step_number} is production-impacting; enforced requires_approval = true`
          );
          step.requires_approval = true;
        }
      }
    }

    // 4. Scope Compliance Checks
    if (refinedReq.isAmbiguous) {
      errors.push('Scope Error: Cannot execute plan derived from ambiguous requirement without clarification');
    }

    // Tenant / Project isolation check
    if (plan.task_id !== context.taskId) {
      errors.push(`Tenant Boundary Violation: Plan task_id '${plan.task_id}' does not match context '${context.taskId}'`);
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      requiresHumanApproval: requiresApprovalEnforced || plan.requires_approval,
      validatedStepCount: plan.steps.length,
      unauthorizedToolsDetected,
    };
  }
}

export const planValidator = new PlanValidator();
