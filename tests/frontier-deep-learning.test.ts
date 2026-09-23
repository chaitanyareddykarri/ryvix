/**
 * @file frontier-deep-learning.test.ts
 * @module tests
 *
 * TEST SUITE 39: FRONTIER DEEP LEARNING ARCHITECTURES & ZERO-COLLISION DUAL-ENGINE SYNERGY
 * 
 * Verifies all 6 Frontier Deep Learning Subsystems:
 * 1. Mixture of Experts (MoE) Dynamic Gating & Top-2 Weighted Blending
 * 2. Graph Neural Network (GNN) Spatial Message-Passing & Cascading Risk
 * 3. Latent World Model Simulator ("AI Dreaming" across 50 Parallel Timelines)
 * 4. Contrastive Representation Learning (InfoNCE Hypersphere Projection)
 * 5. Elastic Weight Consolidation (EWC) Fisher Matrix Anti-Forgetting Regularization
 * 6. Direct Preference Optimization (DPO) Trajectory Margin Alignment
 * 7. Top-Level AGI Core Integration (Zero-Collision Dual-Engine Execution)
 * 8. Conversational Agent Grounded Reasoning & Separation of Concerns
 */

import {
  mixtureOfExperts,
  graphNeuralNetwork,
  latentWorldModel,
  contrastiveLearner,
  elasticWeightConsolidation,
  trajectoryDpoTuner,
  ryvixAgi,
  conversationalAgent,
} from '../services/src';

export async function testFrontierDeepLearning(): Promise<void> {
  console.log('\n======================================================================');
  console.log(' TEST SUITE 39: FRONTIER DEEP LEARNING ARCHITECTURES & ZERO-COLLISION');
  console.log('======================================================================\n');

  // [1] Mixture of Experts (MoE) Dynamic Gating
  console.log('[1] Testing Mixture of Experts (MoE) Dynamic Router & Top-2 Blending...');
  const secInput = new Float32Array(64);
  secInput[5] = 0.95; // heavy failedAuth signal
  secInput[10] = 1.0; // port 22

  const secRoute = mixtureOfExperts.routeAndCompute(secInput);
  if (secRoute.selectedExperts.length !== 2) {
    throw new Error(`MoE router expected top-2 experts, got ${secRoute.selectedExperts.length}`);
  }
  const weightSum = secRoute.selectedExperts[0].weight + secRoute.selectedExperts[1].weight;
  if (Math.abs(weightSum - 1.0) > 0.05) {
    throw new Error(`MoE normalized weights must sum to ~1.0, got ${weightSum}`);
  }
  if (secRoute.topExpertVerdict.domain !== 'SECURITY_DEFENSE') {
    throw new Error(`MoE failed to route security vector to SECURITY_DEFENSE: got ${secRoute.topExpertVerdict.domain}`);
  }
  console.log(`  ✓ MoE Gating verified: TopExpert=[${secRoute.topExpertVerdict.domain}] | Weight=${secRoute.selectedExperts[0].weight} | Latency=${secRoute.routingLatencyMs}ms`);

  // [2] Graph Neural Network (GNN) Spatial Message-Passing
  console.log('[2] Testing Graph Neural Network (GNN) Message-Passing on Cluster Topology...');
  const gnnNodes = [
    { id: 'proxy_edge_01', type: 'EDGE_PROXY' as const, initialState: { cpuPercent: 40, memPercent: 30, activeConnections: 800, errorRate: 0.02 } },
    { id: 'app_backend_01', type: 'APP_RUNTIME' as const, initialState: { cpuPercent: 88, memPercent: 92, activeConnections: 350, errorRate: 0.15 } },
    { id: 'db_postgres_01', type: 'DATABASE' as const, initialState: { cpuPercent: 65, memPercent: 70, activeConnections: 95, errorRate: 0.01 } },
    { id: 'cache_redis_01', type: 'CACHE' as const, initialState: { cpuPercent: 30, memPercent: 45, activeConnections: 200, errorRate: 0.0 } },
  ];

  const gnnEdges = [
    { source: 'proxy_edge_01', target: 'app_backend_01', relationship: 'PROXIES_TO' as const, weight: 0.95 },
    { source: 'app_backend_01', target: 'db_postgres_01', relationship: 'QUERIES' as const, weight: 0.90 },
    { source: 'app_backend_01', target: 'cache_redis_01', relationship: 'WRITES_CACHE' as const, weight: 0.85 },
  ];

  const gnnResult = graphNeuralNetwork.convolveTopology(gnnNodes, gnnEdges, 2);
  if (gnnResult.messagePassingRounds !== 2 || Object.keys(gnnResult.nodeVulnerabilityScores).length !== 4) {
    throw new Error('GNN message-passing layer failed to compute node vulnerability scores.');
  }
  if (!gnnResult.systemicBottleneckNodeId.includes('app_backend')) {
    throw new Error(`GNN failed to identify stressed app_backend as systemic bottleneck: got ${gnnResult.systemicBottleneckNodeId}`);
  }
  console.log(`  ✓ GNN Spatial Convolution verified: Bottleneck=[${gnnResult.systemicBottleneckNodeId}] | MaxRisk=${gnnResult.maxCascadingRisk} | Latency=${gnnResult.inferenceLatencyMs}ms`);

  // [3] Latent World Model Simulator ("AI Dreaming")
  console.log('[3] Testing Latent World Model Simulator (50 Parallel Timelines)...');
  const safeDream = latentWorldModel.dreamRollouts(
    { cpuPercent: 35, memPercent: 45, socketConnections: 120, errorRate: 0.0, uptimeSeconds: 3600 },
    { actionName: 'graceful_reload', command: 'nginx -s reload', targetArchetype: 'WEB_EDGE_PROXY', expectedImpact: 'MILD' },
    5,
    50
  );

  if (!safeDream.isSafeToDispatch || safeDream.stabilityScore < 0.75) {
    throw new Error(`World Model improperly flagged benign reload as unsafe: stability=${safeDream.stabilityScore}`);
  }

  const dangerDream = latentWorldModel.dreamRollouts(
    { cpuPercent: 50, memPercent: 50, socketConnections: 200, errorRate: 0.0, uptimeSeconds: 3600 },
    { actionName: 'flush_firewall', command: 'iptables -F', targetArchetype: 'WEB_EDGE_PROXY', expectedImpact: 'AGGRESSIVE' },
    5,
    50
  );

  if (dangerDream.isSafeToDispatch || dangerDream.expectedDowntimeRisk < 0.50) {
    throw new Error('World Model failed to anticipate catastrophic failure from iptables -F.');
  }
  console.log(`  ✓ World Model Simulator verified: SafeAction Stability=${(safeDream.stabilityScore * 100).toFixed(0)}% | DangerousAction DowntimeRisk=${(dangerDream.expectedDowntimeRisk * 100).toFixed(0)}%`);

  // [4] Contrastive Representation Learning (InfoNCE)
  console.log('[4] Testing Contrastive Representation Learning (InfoNCE Hypersphere)...');
  const normalHypersphere = contrastiveLearner.projectToHypersphere({
    cpuPercent: 22,
    memPercent: 36,
    diskPercent: 41,
    connections: 85,
    failedAuth: 0,
  });
  const normalEval = contrastiveLearner.evaluateContrastiveState(normalHypersphere);

  if (normalEval.nearestCluster !== 'HEALTHY_NORMAL' || normalEval.isZeroDayAnomaly) {
    throw new Error(`Contrastive learner false positive on normal baseline: score=${normalEval.contrastiveAnomalyScore}`);
  }

  const threatHypersphere = contrastiveLearner.projectToHypersphere({
    cpuPercent: 92,
    memPercent: 48,
    diskPercent: 44,
    connections: 920,
    failedAuth: 62,
  });
  const threatEval = contrastiveLearner.evaluateContrastiveState(threatHypersphere);

  if (threatEval.nearestCluster === 'HEALTHY_NORMAL' || threatEval.contrastiveAnomalyScore < 0.50) {
    throw new Error(`Contrastive learner failed to flag anomaly: score=${threatEval.contrastiveAnomalyScore}`);
  }
  console.log(`  ✓ Contrastive InfoNCE verified: NormalScore=${normalEval.contrastiveAnomalyScore} (Loss=${normalEval.infoNceLoss}) | AnomalyScore=${threatEval.contrastiveAnomalyScore}`);

  // [5] Elastic Weight Consolidation (EWC) Anti-Forgetting
  console.log('[5] Testing Elastic Weight Consolidation (EWC) Fisher Regularizer...');
  const baseWeights = new Float32Array(64).fill(0.5);
  const gradients = new Float32Array(64).map((_, i) => (i % 2 === 0 ? 0.8 : 0.05));

  elasticWeightConsolidation.registerMasteredTaskAnchor('task_foundational_kernel_security', baseWeights, gradients, 500);

  const minorDriftWeights = new Float32Array(baseWeights).map((w) => w + 0.01);
  const minorReg = elasticWeightConsolidation.computeEwcPenalty(minorDriftWeights, 0.10);
  if (!minorReg.isDriftAcceptable) {
    throw new Error('EWC flagged acceptable parameter plasticity as unacceptable.');
  }

  const severeDriftWeights = new Float32Array(baseWeights).map((w) => w + 0.45);
  const severeReg = elasticWeightConsolidation.computeEwcPenalty(severeDriftWeights, 0.10);
  if (severeReg.isDriftAcceptable || severeReg.ewcPenalty < 10.0) {
    throw new Error('EWC failed to strongly penalize catastrophic forgetting drift.');
  }
  console.log(`  ✓ EWC Anti-Forgetting verified: MinorDriftPenalty=${minorReg.ewcPenalty} | CatastrophicDriftPenalty=${severeReg.ewcPenalty}`);

  // [6] Direct Preference Optimization (DPO) Trajectory Alignment
  console.log('[6] Testing Direct Preference Optimization (DPO) Trajectory Alignment...');
  const dpoPair = {
    pairId: 'dpo_pair_sre_01',
    contextPrompt: 'Website is sluggish due to exhausted connection pool',
    winningTrajectory: {
      actionName: 'graceful_drain_and_scale',
      codeOrCommand: 'pgbouncer -R && systemctl reload pgbouncer',
      logProbabilityPolicy: -0.45,
      logProbabilityReference: -1.20,
    },
    losingTrajectory: {
      actionName: 'destructive_kill',
      codeOrCommand: 'killall -9 postgres',
      logProbabilityPolicy: -3.80,
      logProbabilityReference: -1.10,
    },
  };

  const dpoResult = trajectoryDpoTuner.evaluatePair(dpoPair);
  if (!dpoResult.isPolicyAligned || dpoResult.implicitRewardMargin <= 0 || dpoResult.preferredProbability < 0.50) {
    throw new Error(`DPO optimization failed to favor winning trajectory: ${JSON.stringify(dpoResult)}`);
  }
  console.log(`  ✓ DPO Trajectory Alignment verified: RewardMargin=${dpoResult.implicitRewardMargin} | WinProb=${(dpoResult.preferredProbability * 100).toFixed(1)}% | Loss=${dpoResult.dpoLoss}`);

  // [7] Top-Level AGI Core Dual-Engine Synergy
  console.log('[7] Testing Top-Level AGI Core Zero-Collision Dual-Engine Synergy...');
  const ooda = await ryvixAgi.executeOodaCycle({
    source: 'web_chat',
    rawObservation: 'Cluster telemetry spike on edge proxy: 500 connections, check for anomalies',
    environmentContext: {
      cpuPercent: 45,
      memPercent: 60,
      connections: 500,
    },
  });

  if (!ooda.moeRouting || !ooda.worldModelForecast || !ooda.contrastiveEval || !ooda.ewcRegularization) {
    throw new Error('AGI OODA cycle missing one or more embedded Frontier Deep Learning outputs.');
  }
  console.log(`  ✓ AGI OODA Dual-Engine verified: MoETopExpert=[${ooda.moeRouting.topExpertVerdict.domain}] | WorldModelSafe=${ooda.worldModelForecast.isSafeToDispatch} | AnomalyScore=${ooda.contrastiveEval.contrastiveAnomalyScore}`);

  // [8] Conversational Agent LLM vs Deep Learning Clarification
  console.log('[8] Testing Conversational Agent LLM vs Deep Learning Grounded Synthesis...');
  const convResp = await conversationalAgent.chat('What is the difference between LLM and deep learning and how do you ensure no collision?');
  if (convResp.detectedIntent !== 'INTENT_LLM_VS_DEEP_LEARNING_DISTINCTION' || convResp.personaUsed !== 'STAFF_ARCHITECT') {
    throw new Error(`Conversational routing failed on LLM vs Deep Learning query: Intent=${convResp.detectedIntent}`);
  }
  if (!convResp.message.includes('Mixture of Experts') || !convResp.message.includes('Zero-Collision')) {
    throw new Error('Conversational response missing core deep learning pillars or zero-collision explanation.');
  }
  console.log(`  ✓ Conversational routing verified: Intent=INTENT_LLM_VS_DEEP_LEARNING_DISTINCTION | Persona=STAFF_ARCHITECT | ResponseLength=${convResp.message.length} chars.`);

  console.log('\n======================================================================');
  console.log(' TEST SUITE 39 PASSED: ALL 8/8 SCENARIOS 100% VERIFIED!');
  console.log('======================================================================\n');
}

if (require.main === module) {
  testFrontierDeepLearning()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
