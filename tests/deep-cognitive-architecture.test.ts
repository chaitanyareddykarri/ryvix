/**
 * @file deep-cognitive-architecture.test.ts
 * @module tests
 *
 * TEST SUITE 37: DEEP COGNITIVE AUTONOMOUS INTELLIGENCE ARCHITECTURE
 * 
 * Verifies all 8 Advanced Cognitive Subsystems:
 * 1. Semantic Vector Cache (<0.01ms instant query serving & associative hits)
 * 2. GraphRAG System Topology Knowledge Graph (Blast radius traversal & BFS pathfinding)
 * 3. Multi-Agent Swarm with Debate & Jury Consensus (Security, SRE, Architecture, Judge)
 * 4. Monte Carlo Tree Search (MCTS) / Graph-of-Thought Planner (UCB1 selection & rollouts)
 * 5. Speculative Execution & Shadow Dry-Run Simulator (Cryptographic certification)
 * 6. Autonomous Reflexion & Self-Correction Loop (ReAct + Self-Critique convergence)
 * 7. Proactive SRE Fleet Exhaustion Forecaster (Predictive Time-To-Failure alerts)
 * 8. Trajectory-Based DPO Self-Improvement Ledger (Preference pair extraction)
 */

import {
  semanticCache,
  systemTopologyGraph,
  swarmJury,
  mctsPlanner,
  speculativeSimulator,
  reflexionEngine,
  predictiveResourceForecaster,
  experienceReplayLedger
} from '../services/src';

export async function testDeepCognitiveArchitecture(): Promise<void> {
  console.log('\n======================================================================');
  console.log(' TEST SUITE 37: DEEP COGNITIVE AUTONOMOUS INTELLIGENCE ARCHITECTURE');
  console.log('======================================================================\n');

  // -------------------------------------------------------------
  // [1] SEMANTIC VECTOR CACHE TESTS
  // -------------------------------------------------------------
  console.log('[1] Testing Semantic Vector Cache (<0.01ms associative lookup)...');
  semanticCache.clear();

  semanticCache.set(
    'why is website throwing 502 bad gateway error',
    { solution: 'Inspect port 3000 and restart node-app', verified: true },
    3600000,
    'SRE'
  );

  // Exact Hit
  const exactHit = semanticCache.get('why is website throwing 502 bad gateway error');
  if (!exactHit.hit || exactHit.similarity !== 1.0) {
    throw new Error(`Semantic cache exact hit failed: hit=${exactHit.hit}, sim=${exactHit.similarity}`);
  }

  // Associative Paraphrased Hit (>0.92 similarity)
  const associativeHit = semanticCache.get('why is my website throwing 502 bad gateway error');
  if (!associativeHit.hit || (associativeHit.similarity ?? 0) < 0.92) {
    throw new Error(`Semantic cache associative hit failed: hit=${associativeHit.hit}, sim=${associativeHit.similarity}`);
  }

  // Cache Miss on Unrelated Query
  const miss = semanticCache.get('how to bake chocolate chip cookies in oven');
  if (miss.hit) {
    throw new Error('Semantic cache returned false-positive hit on completely unrelated query');
  }

  console.log(`  ✓ Semantic Vector Cache validated (Hit in ${associativeHit.latencyMs.toFixed(3)}ms, Similarity: ${associativeHit.similarity}).`);

  // -------------------------------------------------------------
  // [2] GRAPHRAG SYSTEM TOPOLOGY KNOWLEDGE GRAPH TESTS
  // -------------------------------------------------------------
  console.log('[2] Testing GraphRAG System Topology Knowledge Graph (Blast Radius & BFS)...');
  
  // Blast Radius Traversal for Node Backend
  const blast = systemTopologyGraph.getBlastRadius('svc_node_backend', 3);
  const impactedIds = blast.impactedNodes.map((n) => n.id);

  if (!impactedIds.includes('svc_nginx')) {
    throw new Error('GraphRAG blast radius failed to detect Nginx reverse proxy impact when node-app fails');
  }
  if (!impactedIds.includes('db_postgres')) {
    throw new Error('GraphRAG blast radius failed to detect database connected relationship');
  }

  // BFS Pathfinding from API route to PostgreSQL database
  const path = systemTopologyGraph.findDependencyChain('route_chat_api', 'db_postgres');
  if (!path || path.length !== 3 || path[0] !== 'route_chat_api' || path[1] !== 'svc_node_backend' || path[2] !== 'db_postgres') {
    throw new Error(`GraphRAG dependency chain traversal failed: ${JSON.stringify(path)}`);
  }

  console.log(`  ✓ GraphRAG spatial topology validated (${blast.impactedNodes.length} cascading nodes detected, Path: ${path.join(' -> ')}).`);

  // -------------------------------------------------------------
  // [3] MULTI-AGENT SWARM JURY DELIBERATION TESTS
  // -------------------------------------------------------------
  console.log('[3] Testing Multi-Agent Swarm with Debate & Jury Consensus...');
  
  // Destructive Proposal: Should be REJECTED by Security Red-Team
  const destructiveProposal = {
    action: 'cleanup_disk',
    target: 'srv_prod_01',
    command: 'rm -rf /var/log && iptables -F',
    blastRadius: 'critical' as const
  };
  const rejectedVerdict = await swarmJury.deliberate(destructiveProposal);

  if (rejectedVerdict.decision !== 'REJECTED') {
    throw new Error(`Swarm jury expected REJECTED on destructive command, got: ${rejectedVerdict.decision}`);
  }
  if (!rejectedVerdict.requiresHumanApproval) {
    throw new Error('Rejected proposal must require human escalation');
  }

  // Safe SRE Graceful Reload: Should be APPROVED unanimously
  const safeProposal = {
    action: 'reload_proxy',
    target: 'srv_prod_01',
    command: 'nginx -s reload',
    blastRadius: 'low' as const
  };
  const approvedVerdict = await swarmJury.deliberate(safeProposal);

  if (approvedVerdict.decision !== 'APPROVED') {
    throw new Error(`Swarm jury expected APPROVED on graceful reload, got: ${approvedVerdict.decision}`);
  }

  console.log(`  ✓ Multi-Agent Swarm Jury validated (Rejection consensus: ${(rejectedVerdict.consensusScore * 100).toFixed(0)}%, Approval: ${(approvedVerdict.consensusScore * 100).toFixed(0)}%).`);

  // -------------------------------------------------------------
  // [4] MONTE CARLO TREE SEARCH (MCTS) PLANNER TESTS
  // -------------------------------------------------------------
  console.log('[4] Testing Monte Carlo Tree Search (MCTS) / Graph-of-Thought Planner...');
  
  const mctsCandidates = [
    { action: 'drain_node_traffic', description: 'Drain active traffic from target worker', expectedDurationSec: 5, inherentRisk: 0.1 },
    { action: 'apply_schema_migration', description: 'Execute zero-downtime additive database migration', expectedDurationSec: 15, inherentRisk: 0.25 },
    { action: 'rolling_restart_backend', description: 'Perform rolling restart of backend container fleet', expectedDurationSec: 30, inherentRisk: 0.2 },
    { action: 'verify_synthetic_health', description: 'Run post-deployment synthetic probe on /api/health', expectedDurationSec: 5, inherentRisk: 0.05 }
  ];

  const mctsPlan = mctsPlanner.searchOptimalPlan(
    'Execute zero-downtime deployment cutover',
    mctsCandidates,
    25
  );

  if (mctsPlan.optimalTrajectory.length !== 4) {
    throw new Error(`MCTS planner expected 4 planned steps, got ${mctsPlan.optimalTrajectory.length}`);
  }
  if (mctsPlan.overallPlanConfidence < 0.7) {
    throw new Error(`MCTS plan confidence unexpectedly low: ${mctsPlan.overallPlanConfidence}`);
  }

  console.log(`  ✓ MCTS Planner validated (${mctsPlan.nodesExplored} nodes explored, Confidence: ${(mctsPlan.overallPlanConfidence * 100).toFixed(1)}%).`);

  // -------------------------------------------------------------
  // [5] SPECULATIVE EXECUTION SIMULATOR TESTS
  // -------------------------------------------------------------
  console.log('[5] Testing Speculative Execution Simulator & Dry-Run Certification...');
  
  // Safe command
  const safeCert = speculativeSimulator.simulate('systemctl status node-app');
  if (!safeCert.isSafe || safeCert.recommendation !== 'DISPATCH_APPROVED' || !safeCert.certificateHash) {
    throw new Error('Speculative simulator failed on benign status command');
  }

  // Dangerous firewall flush
  const dangerCert = speculativeSimulator.simulate('iptables -F');
  if (dangerCert.isSafe || dangerCert.recommendation !== 'MANUAL_OVERRIDE_REQUIRED') {
    throw new Error('Speculative simulator failed to flag iptables flush');
  }

  console.log(`  ✓ Speculative Simulator validated (Hash: ${safeCert.certificateHash.slice(0, 16)}..., Risk: ${dangerCert.mutationRiskScore}).`);

  // -------------------------------------------------------------
  // [6] AUTONOMOUS REFLEXION & SELF-CORRECTION LOOP TESTS
  // -------------------------------------------------------------
  console.log('[6] Testing Autonomous Reflexion & Self-Correction Loop...');
  
  // Validator checks if candidate contains 'strict_clean_code' and no 'untyped_any'
  const mockValidator = (code: string) => {
    const errors: string[] = [];
    if (code.includes('untyped_any')) {
      errors.push('TypeScript typing violation: untyped_any keyword detected');
    }
    if (!code.includes('strict_clean_code')) {
      errors.push('Missing mandatory strict_clean_code interface implementation');
    }
    return { valid: errors.length === 0, errors };
  };

  // Refine function simulates AI self-correction conditioned on critique
  const mockRefine = (prev: string, critique: string) => {
    let next = prev.replace('untyped_any', 'ExplicitInterface');
    if (!next.includes('strict_clean_code')) {
      next += '\nexport interface strict_clean_code { id: string; }';
    }
    return next;
  };

  const initialFlawedCode = 'const data: untyped_any = { id: "1" };';
  const reflexionResult = await reflexionEngine.executeLoop(
    'task_typing_refactor',
    initialFlawedCode,
    mockRefine,
    mockValidator,
    3
  );

  if (!reflexionResult.converged) {
    throw new Error('Reflexion engine failed to converge on clean candidate');
  }
  if (reflexionResult.iterationsTaken !== 2) {
    throw new Error(`Expected convergence in exactly 2 iterations, took ${reflexionResult.iterationsTaken}`);
  }
  if (!reflexionResult.finalCandidate.includes('strict_clean_code')) {
    throw new Error('Reflexion result missing refined elements');
  }

  console.log(`  ✓ Reflexion loop validated (Converged in ${reflexionResult.iterationsTaken} rounds, Latency: ${reflexionResult.totalLatencyMs}ms).`);

  // -------------------------------------------------------------
  // [7] PROACTIVE SRE FLEET FORECASTER TESTS
  // -------------------------------------------------------------
  console.log('[7] Testing Proactive SRE Fleet Exhaustion Forecaster...');
  
  const now = Date.now();
  const memoryLeakSamples = [
    { timestamp: now - 30 * 60 * 1000, usedValue: 4000, totalValue: 8000 },
    { timestamp: now - 15 * 60 * 1000, usedValue: 6000, totalValue: 8000 },
    { timestamp: now, usedValue: 7200, totalValue: 8000 }
  ];

  const diskSamples = [
    { timestamp: now - 60 * 60 * 1000, usedValue: 20000, totalValue: 100000 },
    { timestamp: now, usedValue: 20500, totalValue: 100000 }
  ];

  const fleetReport = predictiveResourceForecaster.forecastFleet([
    { metricName: 'RAM_WORKER_POOL', samples: memoryLeakSamples },
    { metricName: 'ROOT_DISK_FS', samples: diskSamples }
  ]);

  if (fleetReport.imminentExhaustionCount !== 1) {
    throw new Error(`Fleet forecaster expected 1 imminent exhaustion alert, got ${fleetReport.imminentExhaustionCount}`);
  }
  if (fleetReport.highestRiskMetric !== 'RAM_WORKER_POOL') {
    throw new Error(`Fleet forecaster expected RAM_WORKER_POOL as highest risk, got ${fleetReport.highestRiskMetric}`);
  }

  console.log(`  ✓ Proactive Fleet Forecaster validated (Imminent: ${fleetReport.highestRiskMetric}, Action: ${fleetReport.recommendedPreemptiveActions[0].slice(0, 45)}...).`);

  // -------------------------------------------------------------
  // [8] TRAJECTORY-BASED DPO PREFERENCE LEDGER TESTS
  // -------------------------------------------------------------
  console.log('[8] Testing Trajectory-Based DPO Self-Improvement Ledger...');
  
  const pair = experienceReplayLedger.recordPreference({
    prompt: 'Website 502 Bad Gateway triage',
    chosen: 'systemctl restart app-backend && nginx -s reload',
    rejected: 'reboot -f',
    source: 'user_approval',
    confidenceMargin: 0.92
  });

  if (!pair.id.startsWith('dpo_')) {
    throw new Error(`Invalid DPO pair ID: ${pair.id}`);
  }

  const dpoDataset = experienceReplayLedger.exportDpoDataset(10);
  if (dpoDataset.length === 0) {
    throw new Error('DPO dataset export returned 0 entries');
  }

  console.log(`  ✓ Trajectory DPO Ledger validated (${dpoDataset.length} preference pairs recorded, Source: ${pair.source}).`);

  console.log('\n======================================================================');
  console.log(' TEST SUITE 37 PASSED: 100% OPERATIONAL DEEP COGNITIVE ARCHITECTURE!');
  console.log('======================================================================\n');
}

// Direct execution CLI runner
if (require.main === module) {
  testDeepCognitiveArchitecture().catch((err) => {
    console.error('Test Suite 37 Failed:', err);
    process.exit(1);
  });
}
