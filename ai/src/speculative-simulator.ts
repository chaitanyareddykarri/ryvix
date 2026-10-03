/**
 * @file speculative-simulator.ts
 * @module @ryvix/ai
 *
 * Legacy command-risk heuristic. Does not execute a sandbox or authorize commands.
 * The result hash is an integrity fingerprint, not a signature or approval token.
 */

import * as crypto from 'node:crypto';

export interface DryRunCertificate {
  certificateId: string;
  command: string;
  isSafe: boolean;
  predictedSideEffects: string[];
  mutationRiskScore: number; // 0.0 (safe) to 1.0 (destructive)
  recommendation: 'DISPATCH_APPROVED' | 'MANUAL_OVERRIDE_REQUIRED' | 'STRICTLY_BLOCKED';
  certificateHash: string;
  simulatedAt: string;
  latencyMs: number;
}

export class SpeculativeExecutionSimulator {
  /**
   * Classifies a limited command syntax; unknown input requires independent review.
   */
  public simulate(command: string, context?: Record<string, any>): DryRunCertificate {
    const t0 = performance.now();
    const certificateId = crypto.randomUUID();
    const lower = command.toLowerCase().trim();
    const sideEffects: string[] = [];

    let isSafe = false;
    let riskScore = 0.5;
    let recommendation: 'DISPATCH_APPROVED' | 'MANUAL_OVERRIDE_REQUIRED' | 'STRICTLY_BLOCKED' = 'MANUAL_OVERRIDE_REQUIRED';

    // 1. Destructive Commands & Filesystem Wipe Detection
    if (/rm\s+-[a-z]*r[a-z]*f\s+(\/|\/\*|~\/|\.\/)/.test(lower) || /mkfs|dd\s+if=|:\(\)\{/i.test(lower)) {
      isSafe = false;
      riskScore = 1.0;
      recommendation = 'STRICTLY_BLOCKED';
      sideEffects.push('CRITICAL: Recursive filesystem destruction or kernel fork-bomb pattern detected.');
    }

    // 2. Firewall & Network Blackhole
    if (/iptables\s+-[a-z]*f|ufw\s+disable|ip\s+link\s+set.*down/i.test(lower)) {
      isSafe = false;
      riskScore = Math.max(riskScore, 0.85);
      if (recommendation !== 'STRICTLY_BLOCKED') recommendation = 'MANUAL_OVERRIDE_REQUIRED';
      sideEffects.push('HIGH: Total firewall flush or interface down will sever remote management access.');
    }

    // 3. Process Signals
    if (/pkill\s+-9|killall\s+-9|kill\s+-9\s+1\b/i.test(lower)) {
      riskScore = Math.max(riskScore, 0.65);
      if (recommendation !== 'STRICTLY_BLOCKED') recommendation = 'MANUAL_OVERRIDE_REQUIRED';
      sideEffects.push('MODERATE: SIGKILL (signal 9) prevents graceful socket cleanup; state corruption possible.');
    }

    // 4. Socket and Port Binding Mutations
    if (/bind.*:3000|--port\s+3000|-p\s+3000:3000/i.test(lower)) {
      sideEffects.push('SOCKET: References port 3000; actual availability has not been checked.');
    }

    // 5. Systemctl Service Lifecycle
    if (/systemctl\s+(restart|reload|start)\s+([a-z0-9_-]+)/i.test(lower)) {
      const match = lower.match(/systemctl\s+(restart|reload|start)\s+([a-z0-9_-]+)/i);
      const action = match ? match[1] : 'restart';
      const service = match ? match[2] : 'daemon';
      sideEffects.push(`SYSTEMD: Requests ${action} on ${service}.service; execution and timing are unverified.`);
    }

    // Reject shell composition, expansion and redirection. This is deliberately
    // not a shell parser: only a narrow exact observation form receives a low-risk hint.
    const simpleStatus = /^systemctl[ \t]+status[ \t]+[a-zA-Z0-9_][a-zA-Z0-9_.@-]*$/.test(command.trim());
    if (simpleStatus && recommendation !== 'STRICTLY_BLOCKED') {
      sideEffects.push('HEURISTIC: Recognized service-status syntax; backend authorization remains required.');
      riskScore = 0.01;
      isSafe = true;
      recommendation = 'DISPATCH_APPROVED';
    }

    const latencyMs = performance.now() - t0;
    const now = new Date().toISOString();

    // Unkeyed fingerprint only; not a cryptographic authorization seal
    const hash = crypto
      .createHash('sha256')
      .update(`${certificateId}:${command}:${isSafe}:${riskScore}:${now}`)
      .digest('hex');

    return {
      certificateId,
      command,
      isSafe,
      predictedSideEffects: sideEffects.length > 0 ? sideEffects : ['Unrecognized command: no execution or safety verification performed.'],
      mutationRiskScore: Math.round(riskScore * 100) / 100,
      recommendation,
      certificateHash: hash,
      simulatedAt: now,
      latencyMs: Math.round(latencyMs * 100) / 100
    };
  }
}

export const speculativeSimulator = new SpeculativeExecutionSimulator();
