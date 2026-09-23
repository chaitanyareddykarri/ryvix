/**
 * @file experience-ledger.ts
 * @module @ryvix/ai
 *
 * Reinforcement Experience Replay Ledger
 * Records remediation success and latency outcomes per anomaly fingerprint and host archetype.
 * Dynamically adjusts remedy confidence scores so the AI favors verified actions.
 */

export interface RemediationTrial {
  fingerprint: string;
  archetype: string;
  remedyAction: string;
  remedyCommand: string;
  success: boolean;
  durationMs: number;
  timestamp: number;
}

export interface RemedyScoring {
  remedyAction: string;
  successRate: number; // 0 to 1
  totalTrials: number;
  averageLatencyMs: number;
  recommendedWeight: number; // 0.0 to 1.0
}


export interface DpoPreferencePair {
  id: string;
  prompt: string;
  chosen: string;
  rejected: string;
  source: 'user_approval' | 'remediation_trial' | 'reflexion_loop';
  confidenceMargin: number; // 0.0 to 1.0
  timestamp: string;
}

export class ExperienceReplayLedger {
  private dpoPairs: DpoPreferencePair[] = [];
  private trials: RemediationTrial[] = [];

  public recordTrial(trial: Omit<RemediationTrial, 'timestamp'>): void {
    this.trials.push({
      ...trial,
      timestamp: Date.now(),
    });
  }

  public evaluateRemedyWeights(fingerprint: string, archetype: string): RemedyScoring[] {
    const relevant = this.trials.filter(
      (t) => t.fingerprint === fingerprint && (archetype === '*' || t.archetype === archetype)
    );

    if (relevant.length === 0) {
      return [];
    }

    const actionMap = new Map<string, RemediationTrial[]>();
    for (const t of relevant) {
      const list = actionMap.get(t.remedyAction) || [];
      list.push(t);
      actionMap.set(t.remedyAction, list);
    }

    const scores: RemedyScoring[] = [];

    for (const [action, list] of actionMap.entries()) {
      const successes = list.filter((l) => l.success).length;
      const rate = successes / list.length;
      const totalLatency = list.reduce((sum, l) => sum + l.durationMs, 0);
      const avgLatency = Math.round(totalLatency / list.length);

      // Weighted score based on success rate and trial sample size
      const sampleConfidence = Math.min(1.0, list.length / 5);
      const weight = Math.round((rate * 0.7 + sampleConfidence * 0.3) * 100) / 100;

      scores.push({
        remedyAction: action,
        successRate: rate,
        totalTrials: list.length,
        averageLatencyMs: avgLatency,
        recommendedWeight: weight,
      });
    }

    return scores.sort((a, b) => b.recommendedWeight - a.recommendedWeight);
  }

  public getTrialsCount(): number {
    return this.trials.length;
  }

  public clear(): void {
    this.trials = [];
  }

  public recordPreference(
    pair: Omit<DpoPreferencePair, 'id' | 'timestamp'>
  ): DpoPreferencePair {
    const entry: DpoPreferencePair = {
      id: `dpo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...pair,
      timestamp: new Date().toISOString()
    };
    this.dpoPairs.push(entry);
    return entry;
  }

  public exportDpoDataset(limit: number = 100): DpoPreferencePair[] {
    return this.dpoPairs.slice(-limit);
  }

  public getDpoStats(): { totalPairs: number; sources: Record<string, number> } {
    const sources: Record<string, number> = {};
    for (const p of this.dpoPairs) {
      sources[p.source] = (sources[p.source] || 0) + 1;
    }
    return {
      totalPairs: this.dpoPairs.length,
      sources
    };
  }
}

export const experienceReplayLedger = new ExperienceReplayLedger();
