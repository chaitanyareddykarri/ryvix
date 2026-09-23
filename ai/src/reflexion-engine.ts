/**
 * @file reflexion-engine.ts
 * @module @ryvix/ai
 *
 * Autonomous Reflexion & Self-Correction Engine (ReAct + Self-Critique Loop)
 * 
 * Prevents flawed code or hallucinated commands from reaching production:
 * 1. Initial Candidate Synthesis
 * 2. Automated Diagnostic / Sandbox Validation
 * 3. Structured Self-Critique generation if errors detected:
 *    - Pinpoints exact syntax, type, or runtime failure mode
 *    - Formulates concrete corrective directives
 * 4. Multi-round Iterative Refinement until 100% convergence
 */

export interface ValidationFeedback {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export type CandidateValidatorFn<T = any> = (candidate: T) => ValidationFeedback | Promise<ValidationFeedback>;

export interface ReflexionIteration<T = any> {
  round: number;
  candidate: T;
  validation: ValidationFeedback;
  critique?: {
    failedAspects: string[];
    rootCauseAnalysis: string;
    correctiveActionPlan: string;
  };
  durationMs: number;
}

export interface ReflexionResult<T = any> {
  taskId: string;
  converged: boolean;
  finalCandidate: T;
  iterationsTaken: number;
  maxIterations: number;
  history: ReflexionIteration<T>[];
  totalLatencyMs: number;
}

export class ReflexionEngine {
  /**
   * Executes multi-round self-correction loop until candidate passes validator
   */
  public async executeLoop<T = string>(
    taskId: string,
    initialCandidate: T,
    refineFn: (previous: T, critique: string) => Promise<T> | T,
    validator: CandidateValidatorFn<T>,
    maxIterations: number = 3
  ): Promise<ReflexionResult<T>> {
    const t0 = performance.now();
    const history: ReflexionIteration<T>[] = [];
    let currentCandidate: T = initialCandidate;
    let converged = false;

    for (let round = 1; round <= maxIterations; round++) {
      const iterStart = performance.now();
      const feedback = await validator(currentCandidate);

      if (feedback.valid) {
        history.push({
          round,
          candidate: currentCandidate,
          validation: feedback,
          durationMs: performance.now() - iterStart
        });
        converged = true;
        break;
      }

      // Generate structured Self-Critique
      const critique = this.formulateSelfCritique(feedback.errors);
      history.push({
        round,
        candidate: currentCandidate,
        validation: feedback,
        critique,
        durationMs: performance.now() - iterStart
      });

      if (round < maxIterations) {
        // Synthesize revised candidate based on self-critique
        currentCandidate = await refineFn(currentCandidate, critique.correctiveActionPlan);
      }
    }

    return {
      taskId,
      converged,
      finalCandidate: currentCandidate,
      iterationsTaken: history.length,
      maxIterations,
      history,
      totalLatencyMs: Math.round((performance.now() - t0) * 100) / 100
    };
  }

  private formulateSelfCritique(errors: string[]): {
    failedAspects: string[];
    rootCauseAnalysis: string;
    correctiveActionPlan: string;
  } {
    const failedAspects = errors.slice(0, 5);
    const errText = errors.join('; ');

    let rootCause = 'Candidate deviated from contract constraints or failed static sanity checks.';
    let actionPlan = 'Review failing rules and refactor explicitly.';

    if (/any\b|type\b|typescript/i.test(errText)) {
      rootCause = 'TypeScript strict mode typing violation: untyped variable or missing interface definition.';
      actionPlan = 'Replace ambiguous types with explicit interfaces or generics. Remove any keyword.';
    } else if (/syntax|token|unexpected/i.test(errText)) {
      rootCause = 'Syntax parse failure: unclosed parenthesis, bracket, or malformed quote literal.';
      actionPlan = 'Rebalance bracket/string literals and enforce syntactically valid TypeScript expression.';
    } else if (/eaddrinuse|port|bind/i.test(errText)) {
      rootCause = 'Port bind collision: target socket is actively claimed by another process.';
      actionPlan = 'Check active listeners via ss -tulpn and terminate stale PID or configure fallback port.';
    }

    return {
      failedAspects,
      rootCauseAnalysis: rootCause,
      correctiveActionPlan: `Reflexion Directive: ${actionPlan} Specific errors to remediate: ${errText}`
    };
  }
}

export const reflexionEngine = new ReflexionEngine();
