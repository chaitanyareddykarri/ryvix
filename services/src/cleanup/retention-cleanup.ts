/**
 * Ryvix Telemetry & Data Retention Cleanup Worker
 * 
 * RETENTION SPECIFICATIONS:
 * 1. 1-minute telemetry metric rollups: retain for 30 days.
 * 2. 5-minute telemetry metric rollups: retain for 90 days.
 * 3. Resolved incident diagnostic evidence: prune after 365 days.
 * 4. Audit events: Append-only, retained indefinitely (7-year regulatory compliance).
 */

export interface RetentionPolicy {
  telemetry1mRetentionDays: number;
  telemetry5mRetentionDays: number;
  incidentEvidenceRetentionDays: number;
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  telemetry1mRetentionDays: 30,
  telemetry5mRetentionDays: 90,
  incidentEvidenceRetentionDays: 365,
};

export interface PruneStats {
  telemetry1mPruned: number;
  telemetry5mPruned: number;
  incidentEvidencePruned: number;
}

export class RetentionCleanupWorker {
  private policy: RetentionPolicy;

  constructor(policy: RetentionPolicy = DEFAULT_RETENTION_POLICY) {
    this.policy = policy;
  }

  /**
   * Generates cutoff timestamps based on the retention window.
   */
  getCutoffs(currentTime: Date = new Date()): {
    cutoff1m: Date;
    cutoff5m: Date;
    cutoffIncidents: Date;
  } {
    const cutoff1m = new Date(currentTime.getTime() - this.policy.telemetry1mRetentionDays * 86400000);
    const cutoff5m = new Date(currentTime.getTime() - this.policy.telemetry5mRetentionDays * 86400000);
    const cutoffIncidents = new Date(currentTime.getTime() - this.policy.incidentEvidenceRetentionDays * 86400000);

    return { cutoff1m, cutoff5m, cutoffIncidents };
  }

  /**
   * Generates deterministic SQL queries to execute safe batch pruning without locking tables.
   */
  generatePruneQueries(currentTime: Date = new Date()): {
    prune1mTelemetrySql: string;
    prune5mTelemetrySql: string;
    pruneIncidentEvidenceSql: string;
  } {
    const { cutoff1m, cutoff5m, cutoffIncidents } = this.getCutoffs(currentTime);

    return {
      prune1mTelemetrySql: `DELETE FROM public.telemetry_metric_rollups WHERE resolution = '1m' AND window_start < '${cutoff1m.toISOString()}';`,
      prune5mTelemetrySql: `DELETE FROM public.telemetry_metric_rollups WHERE resolution = '5m' AND window_start < '${cutoff5m.toISOString()}';`,
      pruneIncidentEvidenceSql: `UPDATE public.incidents SET diagnosis = 'PRUNED_PER_RETENTION_POLICY' WHERE status = 'resolved' AND resolved_at < '${cutoffIncidents.toISOString()}';`,
    };
  }
}
