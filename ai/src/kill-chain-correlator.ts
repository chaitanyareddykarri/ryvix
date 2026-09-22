/**
 * @file kill-chain-correlator.ts
 * @module @ryvix/ai
 *
 * Multi-Stage Attack Kill-Chain Correlator
 * Tracks security events per client IP and host across sliding time windows.
 * Correlates discrete signals (Recon -> Foothold -> Privilege Escalation -> Exfiltration)
 * into a single unified incident narrative and triggers preemptive quarantine.
 */

export type KillChainStage = 
  | 'RECONNAISSANCE'
  | 'INITIAL_FOOTHOLD'
  | 'PRIVILEGE_ESCALATION'
  | 'PERSISTENCE_ESTABLISHED'
  | 'LATERAL_MOVEMENT'
  | 'DATA_EXFILTRATION_OR_DESTRUCTION';

export interface SecurityEventSignal {
  timestamp: number;
  sourceIp: string;
  targetHostId: string;
  threatType: string;
  stage: KillChainStage;
  confidence: number;
  rawIndicator: string;
}

export interface KillChainProgression {
  sourceIp: string;
  targetHostId: string;
  activeStages: KillChainStage[];
  currentStage: KillChainStage;
  progressionScore: number; // 0 to 100
  eventCount: number;
  isPreempted: boolean;
  narrativeSummary: string;
  preemptiveRemedyCommands: string[];
}

export class KillChainCorrelator {
  private eventHistory: SecurityEventSignal[] = [];
  private windowDurationMs: number = 30 * 60 * 1000; // 30-minute sliding window

  constructor(windowDurationMs?: number) {
    if (windowDurationMs) {
      this.windowDurationMs = windowDurationMs;
    }
  }

  public recordSignal(
    sourceIp: string,
    targetHostId: string,
    threatType: string,
    rawIndicator: string,
    timestamp: number = Date.now()
  ): KillChainProgression {
    const stage = this.mapThreatToStage(threatType, rawIndicator);
    const signal: SecurityEventSignal = {
      timestamp,
      sourceIp,
      targetHostId,
      threatType,
      stage,
      confidence: 0.95,
      rawIndicator,
    };

    this.eventHistory.push(signal);
    this.pruneOldEvents(timestamp);

    return this.evaluateChain(sourceIp, targetHostId, timestamp);
  }

  public mapThreatToStage(threatType: string, raw: string): KillChainStage {
    const upper = (threatType + ' ' + raw).toUpperCase();

    if (upper.includes('SCAN') || upper.includes('PROBING') || upper.includes('RECON') || upper.includes('ENUM')) {
      return 'RECONNAISSANCE';
    }
    if (
      upper.includes('SQL_INJECTION') ||
      upper.includes('COMMAND_INJECTION') ||
      upper.includes('GRAPHQL') ||
      upper.includes('XSS') ||
      upper.includes('SSRF') ||
      upper.includes('SSTI') ||
      upper.includes('PATH_TRAVERSAL')
    ) {
      return 'INITIAL_FOOTHOLD';
    }
    if (
      upper.includes('PRIVILEGE_ESCALATION') ||
      upper.includes('PWNKIT') ||
      upper.includes('DIRTYPIPE') ||
      upper.includes('SUDO') ||
      upper.includes('SUID')
    ) {
      return 'PRIVILEGE_ESCALATION';
    }
    if (
      upper.includes('CRON') ||
      upper.includes('PERSISTENCE') ||
      upper.includes('SSH_AUTHORIZED_KEYS') ||
      upper.includes('SYSTEMD_UNIT_BACKDOOR')
    ) {
      return 'PERSISTENCE_ESTABLISHED';
    }
    if (
      upper.includes('LATERAL') ||
      upper.includes('SMB_RELAY') ||
      upper.includes('INTERNAL_PIVOT')
    ) {
      return 'LATERAL_MOVEMENT';
    }
    if (
      upper.includes('EXFILTRATION') ||
      upper.includes('REVERSE_SHELL') ||
      upper.includes('RANSOMWARE') ||
      upper.includes('MINER') ||
      upper.includes('DNS_TUNNEL')
    ) {
      return 'DATA_EXFILTRATION_OR_DESTRUCTION';
    }

    return 'INITIAL_FOOTHOLD';
  }

  public evaluateChain(sourceIp: string, targetHostId: string, now: number = Date.now()): KillChainProgression {
    const relevantEvents = this.eventHistory.filter(
      (e) => e.sourceIp === sourceIp && (targetHostId === '*' || e.targetHostId === targetHostId)
    );

    const stagesSet = new Set<KillChainStage>();
    for (const ev of relevantEvents) {
      stagesSet.add(ev.stage);
    }

    const orderedStages: KillChainStage[] = [
      'RECONNAISSANCE',
      'INITIAL_FOOTHOLD',
      'PRIVILEGE_ESCALATION',
      'PERSISTENCE_ESTABLISHED',
      'LATERAL_MOVEMENT',
      'DATA_EXFILTRATION_OR_DESTRUCTION',
    ];

    const activeStages = orderedStages.filter((st) => stagesSet.has(st));
    const currentStage = activeStages.length > 0 ? activeStages[activeStages.length - 1] : 'RECONNAISSANCE';

    const highestStageIndex = orderedStages.indexOf(currentStage);
    const stageWeight = ((highestStageIndex + 1) / orderedStages.length) * 70;
    const countWeight = Math.min(30, relevantEvents.length * 6);
    const progressionScore = Math.min(100, Math.round(stageWeight + countWeight));

    const narrativeSummary = this.buildNarrative(sourceIp, activeStages, relevantEvents.length, progressionScore);
    const preemptiveRemedyCommands = this.generatePreemptionRemedies(sourceIp, activeStages);

    return {
      sourceIp,
      targetHostId,
      activeStages,
      currentStage,
      progressionScore,
      eventCount: relevantEvents.length,
      isPreempted: progressionScore >= 60,
      narrativeSummary,
      preemptiveRemedyCommands,
    };
  }

  private buildNarrative(ip: string, stages: KillChainStage[], count: number, score: number): string {
    if (stages.length <= 1) {
      return `Isolated single-stage activity detected from IP ${ip} (${stages[0] || 'NONE'}). Severity: ${score}/100.`;
    }
    return `CRITICAL MULTI-STAGE KILL-CHAIN ACTIVE: Attacker from IP ${ip} progressed across ${stages.length} distinct stages: [${stages.join(' -> ')}] with ${count} logged signals. Preemptive cluster containment recommended (Score: ${score}/100).`;
  }

  private generatePreemptionRemedies(ip: string, stages: KillChainStage[]): string[] {
    const remedies: string[] = [
      `iptables -I INPUT -s ${ip} -j DROP`,
      `ip route add blackhole ${ip}/32 2>/dev/null || true`,
    ];

    if (stages.includes('PRIVILEGE_ESCALATION')) {
      remedies.push('pkill -9 -u $(whoami) 2>/dev/null || true');
      remedies.push('chmod 640 /etc/shadow && chown root:shadow /etc/shadow');
    }
    if (stages.includes('PERSISTENCE_ESTABLISHED')) {
      remedies.push('ls -la /etc/cron* /var/spool/cron/crontabs && crontab -l');
      remedies.push('find /root/.ssh /home/*/.ssh -name authorized_keys -mmin -120');
    }
    if (stages.includes('DATA_EXFILTRATION_OR_DESTRUCTION')) {
      remedies.push('ss -K dst ' + ip + ' 2>/dev/null || true');
      remedies.push('pkill -9 -f "nc|ncat|bash -i|sh -i|python -c.*socket" 2>/dev/null || true');
    }

    return remedies;
  }

  private pruneOldEvents(now: number): void {
    const cutoff = now - this.windowDurationMs;
    this.eventHistory = this.eventHistory.filter((e) => e.timestamp >= cutoff);
  }

  public clear(): void {
    this.eventHistory = [];
  }
}

export const killChainCorrelator = new KillChainCorrelator();
