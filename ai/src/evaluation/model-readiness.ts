/**
 * Ryvix Model-Readiness & Evaluation Architecture
 * 
 * Responsibilities:
 * - Captures structured execution trajectories for offline evaluation & future fine-tuning
 * - Strictly separates:
 *   1. Production Execution Data (transient, active session state)
 *   2. Evaluation Data (benchmarks, regression tests, accuracy scoring)
 *   3. Future Fine-Tuning Datasets (sanitized, validated JSONL instruction pairs)
 * - Legacy offline helper; sanitization does not establish consent or anonymization
 * - Evaluates model quality based on plan validity, build success, and user acceptance rates
 */

import { RefinedRequirement } from '../understanding/intent-processor';
import { TaskContext } from '../context/context-builder';
import type { Plan } from '@ryvix/database';
import { PlanValidationResult } from '../validation/plan-validator';
import {sanitizeLearningEvent} from '../learning-event';

export interface ExecutionDataPoint {
  id: string;
  timestamp: string;
  rawUserPrompt: string;
  refinedRequirement: RefinedRequirement;
  contextSummary: {
    framework: string;
    targetFiles: string[];
    allowedToolsCount: number;
  };
  llmPlan: Plan;
  validationResult: PlanValidationResult;
  buildTestOutcome: {
    buildPassed: boolean;
    testsPassed: boolean;
    exitCode: number;
  };
  userApprovalOutcome: {
    status: 'approved' | 'rejected' | 'pending';
    feedbackNotes?: string;
  };
  finalOutcome: 'success' | 'failure' | 'discarded';
  latencyMs?: number;
  qualityScore: number; // 0.0 - 1.0
}

export interface ModelEvaluationMetrics {
  totalInteractions: number;
  planValidationPassRate: number | null;
  userApprovalRate: number | null;
  buildSuccessRate: number | null;
  averageLatencyMs: number | null;
  averageQualityScore: number | null;
}

export class ModelReadinessManager {
  private productionInteractions: ExecutionDataPoint[] = [];
  private evaluationBenchmarkSet: ExecutionDataPoint[] = [];

  /**
   * Records a complete lifecycle interaction point.
   */
  recordInteraction(point: ExecutionDataPoint): void {
    // Sanitize any stray secret tokens in user prompt or notes
    if(!Number.isFinite(point.qualityScore)||point.qualityScore<0||point.qualityScore>1)throw new Error('Measured quality score required');
    const sanitized = this.sanitizeDataPoint(point);
    this.productionInteractions.push(sanitized);

    // If high quality and user-approved, promote to evaluation benchmark set
    if (sanitized.qualityScore >= 0.8 && sanitized.userApprovalOutcome.status === 'approved') {
      this.evaluationBenchmarkSet.push(sanitized);
    }
  }

  /**
   * Computes evaluation metrics across current dataset.
   */
  getEvaluationMetrics(): ModelEvaluationMetrics {
    const total = this.productionInteractions.length;
    if (total === 0) {
      return {
        totalInteractions: 0,
        planValidationPassRate: null,
        userApprovalRate: null,
        buildSuccessRate: null,
        averageLatencyMs: null,
        averageQualityScore: null,
      };
    }

    const validPlans = this.productionInteractions.filter((p) => p.validationResult.isValid).length;
    const approved = this.productionInteractions.filter((p) => p.userApprovalOutcome.status === 'approved').length;
    const buildPassed = this.productionInteractions.filter((p) => p.buildTestOutcome.buildPassed).length;
    const avgScore =
      this.productionInteractions.reduce((acc, p) => acc + p.qualityScore, 0) / total;

    const latencies = this.productionInteractions.map(p=>p.latencyMs).filter((v): v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0);
    return {
      totalInteractions: total,
      planValidationPassRate: Number((validPlans / total).toFixed(3)),
      userApprovalRate: Number((approved / total).toFixed(3)),
      buildSuccessRate: Number((buildPassed / total).toFixed(3)),
      averageLatencyMs: latencies.length ? latencies.reduce((sum,v)=>sum+v,0)/latencies.length : null,
      averageQualityScore: Number(avgScore.toFixed(3)),
    };
  }

  /**
   * Exports sanitized, validated JSONL dataset suitable for Hugging Face / PyTorch SFT Trainer.
   */
  exportFineTuningDataset(options?: { minQualityScore?: number }): string {
    const minScore = options?.minQualityScore ?? 0.75;
    const eligible = this.evaluationBenchmarkSet.filter((p) => p.qualityScore >= minScore);

    const jsonlRows = eligible.map((entry) => {
      const messages = [
        {
          role: 'system',
          content: 'You are Ryvix Autonomous Software Operations AI. Formulate structured execution plans from refined requirements.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            rawPrompt: entry.rawUserPrompt,
            refinedRequirement: entry.refinedRequirement,
            context: entry.contextSummary,
          }),
        },
        {
          role: 'assistant',
          content: JSON.stringify({
            planTitle: entry.llmPlan.title,
            steps: entry.llmPlan.steps,
          }),
        },
      ];

      return JSON.stringify({ messages });
    });

    return jsonlRows.join('\n');
  }

  /**
   * Strips all secrets, tokens, passwords, and private keys.
   */
  private sanitizeDataPoint(point: ExecutionDataPoint): ExecutionDataPoint {
    point=sanitizeLearningEvent(point as unknown as Record<string,unknown>) as unknown as ExecutionDataPoint;
    const secretRegex = /(?:password|secret|token|key|api_key|bearer|ghp_|sk-)[\s:=]+[a-zA-Z0-9_\-\.]+/gi;
    
    const cleanPrompt = point.rawUserPrompt.replace(secretRegex, '[REDACTED_SECRET]');
    const cleanNotes = point.userApprovalOutcome.feedbackNotes
      ? point.userApprovalOutcome.feedbackNotes.replace(secretRegex, '[REDACTED_SECRET]')
      : undefined;

    return {
      ...point,
      rawUserPrompt: cleanPrompt,
      userApprovalOutcome: {
        ...point.userApprovalOutcome,
        feedbackNotes: cleanNotes,
      },
    };
  }

  /**
   * Clears transient production execution points while preserving benchmarks.
   */
  clearEphemeralProductionData(): void {
    this.productionInteractions = [];
  }
}

export const modelReadinessManager = new ModelReadinessManager();
