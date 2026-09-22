/**
 * Ryvix Structured Plan Generator
 * 
 * Responsibilities:
 * - Bridges Refined Requirement + Scoped Context + LLM Gateway
 * - Emits typed Plan & PlanStep objects conforming strictly to @ryvix/database schema
 * - Avoids duplicate Plan systems by using the existing Ryvix domain model
 */

import type { Plan, PlanStep } from '@ryvix/database';
import { RefinedRequirement } from '../understanding/intent-processor';
import { TaskContext } from '../context/context-builder';
import { aiAgentLLMGateway, StructuredLLMPlanResult } from '../llm/llm-gateway';

export interface PlanGenerationResult {
  plan: Plan;
  llmMetadata: {
    providerUsed: string;
    modelUsed: string;
    latencyMs: number;
    isFallback: boolean;
  };
}

export class PlanGenerator {
  /**
   * Generates a fully formed Ryvix Plan adhering to the database domain model.
   */
  async generatePlan(
    refinedReq: RefinedRequirement,
    context: TaskContext
  ): Promise<PlanGenerationResult> {
    const rawResult: StructuredLLMPlanResult = await aiAgentLLMGateway.generateStructuredPlan(
      refinedReq,
      context
    );

    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const steps: PlanStep[] = rawResult.steps.map((s, idx) => ({
      id: `step_${planId}_${s.step_number}`,
      plan_id: planId,
      step_number: s.step_number,
      title: s.title,
      description: s.description,
      suggested_tool: s.suggested_tool,
      tool_arguments: s.tool_arguments || {},
      requires_approval: s.requires_approval,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const plan: Plan = {
      id: planId,
      task_id: context.taskId,
      version: 1,
      title: rawResult.planTitle,
      steps,
      requires_approval: steps.some((s) => s.requires_approval),
      approved_by: null,
      approved_at: null,
      status: 'planning',
      created_at: new Date().toISOString(),
    };

    return {
      plan,
      llmMetadata: {
        providerUsed: rawResult.providerUsed,
        modelUsed: rawResult.modelUsed,
        latencyMs: rawResult.latencyMs,
        isFallback: rawResult.isFallback,
      },
    };
  }
}

export const planGenerator = new PlanGenerator();
