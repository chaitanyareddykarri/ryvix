/**
 * @file predictive-forecast.ts
 * @module @ryvix/ai
 *
 * Predictive Resource Trend & Metric Exhaustion Forecaster
 * Evaluates rolling rate-of-change (velocity) for disk, memory, and connections.
 * Predicts Time-To-Exhaustion (TTE in minutes) and triggers pre-crash mitigation.
 */

export interface MetricSample {
  timestamp: number; // epoch ms
  usedValue: number; // e.g., MB or percent
  totalValue: number;
}

export interface ForecastEvaluation {
  metricName: string;
  currentUsagePercent: number;
  growthVelocityPerMinute: number;
  timeToExhaustionMinutes: number | null; // null if stable or declining
  isExhaustionImminent: boolean; // < 180 minutes to exhaustion
  recommendedPreemptiveAction: string;
}

export class PredictiveResourceForecaster {
  public forecastExhaustion(
    metricName: string,
    history: MetricSample[],
    warningThresholdMinutes: number = 180
  ): ForecastEvaluation {
    if (history.length < 2) {
      throw new Error('At least 2 historical metric samples required for velocity calculation');
    }

    // Sort by timestamp
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];

    const currentUsagePercent = (latest.usedValue / latest.totalValue) * 100;
    const timeDeltaMinutes = (latest.timestamp - first.timestamp) / (1000 * 60);

    if (timeDeltaMinutes <= 0) {
      throw new Error('Sample time delta must be greater than 0');
    }

    const valueDelta = latest.usedValue - first.usedValue;
    const growthVelocityPerMinute = valueDelta / timeDeltaMinutes;

    let timeToExhaustionMinutes: number | null = null;
    let isExhaustionImminent = false;

    if (growthVelocityPerMinute > 0) {
      const remainingCapacity = latest.totalValue - latest.usedValue;
      timeToExhaustionMinutes = Math.round(remainingCapacity / growthVelocityPerMinute);
      if (timeToExhaustionMinutes <= warningThresholdMinutes) {
        isExhaustionImminent = true;
      }
    }

    const action = this.determinePreemptiveAction(metricName, currentUsagePercent, timeToExhaustionMinutes);

    return {
      metricName,
      currentUsagePercent: Math.round(currentUsagePercent * 10) / 10,
      growthVelocityPerMinute: Math.round(growthVelocityPerMinute * 100) / 100,
      timeToExhaustionMinutes,
      isExhaustionImminent,
      recommendedPreemptiveAction: action,
    };
  }

  private determinePreemptiveAction(metric: string, currentPct: number, tteMinutes: number | null): string {
    const lower = metric.toLowerCase();
    if (lower.includes('disk') || lower.includes('storage')) {
      if (tteMinutes !== null && tteMinutes < 120) {
        return 'CRITICAL PREEMPTION: Vacuum systemd journals (`journalctl --vacuum-size=200M`) and purge `/tmp` cache files.';
      }
      return 'Monitor disk growth rate; schedule nightly log rotation.';
    }

    if (lower.includes('ram') || lower.includes('memory')) {
      if (tteMinutes !== null && tteMinutes < 60) {
        return 'CRITICAL PREEMPTION: Flush OS buffer cache (`sync; echo 3 > /proc/sys/vm/drop_caches`) and trigger worker pool graceful reload.';
      }
      return 'Monitor RAM leak trend.';
    }

    return 'Evaluate service connection pooling.';
  }
}

export const predictiveResourceForecaster = new PredictiveResourceForecaster();
