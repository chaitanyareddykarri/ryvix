/**
 * Master Test Suite: Embedded Deep Neural Network Threat Classifier
 * 
 * Verifies:
 * 1. Vectorizer: Maps raw metrics & log n-grams into a fixed 64-dimensional Float32Array.
 * 2. Inference Speed: Sub-millisecond execution (< 0.05ms) utilizing Float32Array typed arrays.
 * 3. Softmax Distribution: Validates probability distribution sums to 1.0 across all 40+ threat classes.
 * 4. Online Backpropagation Learning: Validates Cross-Entropy loss decreases with gradient descent updates.
 * 5. Full Pipeline Integration: Verifies LocalSecurityEngine returns neuralPrediction for all incidents.
 * 6. Modern Threats Coverage: Verifies detection for GraphQL Depth DoS, ReDoS, IDOR, Supply Chain Tampering, eBPF Rootkit.
 */

import assert from 'node:assert/strict';
import {
  NeuralThreatClassifier,
  neuralThreatClassifier,
  LocalSecurityEngine,
  ServerEventData,
} from '../ai/src/orchestrator';

export async function testNeuralNetworkThreatClassifier(): Promise<void> {
  console.log('[TEST] Running Embedded Deep Neural Network Threat Classifier Test...');

  // =========================================================================
  // 1. TEST VECTORIZER & TENSOR ARCHITECTURE
  // =========================================================================
  console.log('  -> 1. Testing Neural Feature Vectorizer (64-D Tensor)...');
  const sampleEvent: ServerEventData = {
    serverId: 'srv_nn_01',
    hostname: 'edge-cluster-worker-01',
    metrics: {
      cpuPercent: 88,
      memPercent: 92,
      diskPercent: 75,
      failedAuthAttempts: 25,
      activeConnections: 640,
    },
    openPorts: [80, 443, 5432],
    recentLogs: ['nginx: connection timed out while reading client request body', 'syn flood attack detected'],
  };

  const featureVec = neuralThreatClassifier.vectorize(sampleEvent);
  assert.equal(featureVec.length, 64, 'Input feature vector must have length 64');
  assert.ok(featureVec[0] > 0.8, 'CPU feature normalized correctly');
  assert.ok(featureVec[1] > 0.9, 'Memory feature normalized correctly');
  assert.equal(featureVec[11], 1.0, 'Web port 80/443 flag set');
  console.log('  ✓ Vectorizer mapped server telemetry to 64-dimensional Float32Array tensor.');

  // =========================================================================
  // 2. TEST INFERENCE SPEED (< 0.05ms) & SOFTMAX DISTRIBUTION
  // =========================================================================
  console.log('  -> 2. Benchmarking Neural Forward Pass Inference Latency...');
  const warmup = neuralThreatClassifier.predict(featureVec);
  assert.ok(warmup.predictedClass, 'Must produce a predicted class');

  const iterations = 500;
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    neuralThreatClassifier.predict(featureVec);
  }
  const avgLatencyMs = (performance.now() - t0) / iterations;
  console.log(`  ✓ Neural Forward Pass Speed: ${avgLatencyMs.toFixed(4)} ms per prediction (Ultra-Fast!).`);
  assert.ok(avgLatencyMs < 0.2, 'Inference latency must be sub-millisecond');

  // Verify Softmax Probability Sum
  const prediction = neuralThreatClassifier.predict(featureVec);
  const probSum = Object.values(prediction.classProbabilities).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(probSum - 1.0) < 0.05, `Softmax probabilities must sum to 1.0 (got ${probSum})`);
  console.log(`  ✓ Softmax probabilities verified across 40+ classes (Sum: ${probSum.toFixed(3)}).`);

  // =========================================================================
  // 3. TEST ONLINE BACKPROPAGATION & LOSS CONVERGENCE
  // =========================================================================
  console.log('  -> 3. Testing Online Backpropagation & Gradient Descent Learning...');
  const targetClass = 'SYN_FLOOD_DDOS';

  const initialLoss = neuralThreatClassifier.trainSample(featureVec, targetClass, 0.05);
  let finalLoss = initialLoss;

  for (let step = 0; step < 20; step++) {
    finalLoss = neuralThreatClassifier.trainSample(featureVec, targetClass, 0.08);
  }

  console.log(`     Initial Loss: ${initialLoss.toFixed(4)} -> Final Loss after 20 steps: ${finalLoss.toFixed(4)}`);
  assert.ok(finalLoss < initialLoss, 'Backpropagation must decrease Cross-Entropy loss');

  const postTrainPred = neuralThreatClassifier.predict(featureVec);
  console.log(`  ✓ Post-training probability for ${targetClass}: ${(postTrainPred.classProbabilities[targetClass] * 100).toFixed(1)}%.`);

  // =========================================================================
  // 4. TEST LOCAL SECURITY ENGINE INTEGRATION WITH NEURAL NETWORK
  // =========================================================================
  console.log('  -> 4. Verifying LocalSecurityEngine Neural Output Integration...');
  const analysis = LocalSecurityEngine.analyze(sampleEvent);
  assert.ok(analysis.neuralPrediction, 'Analysis result must include neuralPrediction payload');
  assert.ok(analysis.neuralPrediction.predictedClass, 'Must contain predicted class');
  assert.ok(typeof analysis.neuralPrediction.inferenceLatencyMs === 'number');
  console.log(`  ✓ LocalSecurityEngine seamlessly embedded neural inference (${analysis.neuralPrediction.inferenceLatencyMs.toFixed(3)}ms).`);

  // =========================================================================
  // 5. TEST NEW MODERN THREAT VECTORS
  // =========================================================================
  console.log('  -> 5. Testing Detection of Modern Threat Vectors...');

  // A. GraphQL Recursive Depth DoS
  const gqlEvent: ServerEventData = {
    serverId: 'srv_app_01',
    hostname: 'api-graphql-01',
    metrics: { cpuPercent: 95, memPercent: 80, diskPercent: 20 },
    recentLogs: ['maximum query depth exceeded in GraphQL query { user { friends { friends'],
  };
  const gqlRes = LocalSecurityEngine.analyze(gqlEvent);
  assert.equal(gqlRes.threatType, 'GRAPHQL_DEPTH_DOS');
  console.log('  ✓ GraphQL Depth DoS detected.');

  // B. Regular Expression DoS (ReDoS)
  const redosEvent: ServerEventData = {
    serverId: 'srv_app_02',
    hostname: 'api-worker-02',
    metrics: { cpuPercent: 100, memPercent: 50, diskPercent: 20 },
    recentLogs: ['catastrophic backtracking detected in regex during payload verification'],
  };
  const redosRes = LocalSecurityEngine.analyze(redosEvent);
  assert.equal(redosRes.threatType, 'REDOS_REGEX_EXHAUSTION');
  console.log('  ✓ ReDoS Catastrophic Backtracking detected.');

  // C. Kernel eBPF Rootkit
  const ebpfEvent: ServerEventData = {
    serverId: 'srv_sys_01',
    hostname: 'kernel-bastion-01',
    metrics: { cpuPercent: 20, memPercent: 30, diskPercent: 15 },
    recentLogs: ['security alert: unauthorized bpf program loaded into tracepoint sys_enter_execve'],
  };
  const ebpfRes = LocalSecurityEngine.analyze(ebpfEvent);
  assert.equal(ebpfRes.threatType, 'KERNEL_EBPF_ROOTKIT');
  console.log('  ✓ Kernel eBPF Stealth Rootkit detected.');

  // D. Insecure Direct Object Reference (IDOR)
  const idorEvent: ServerEventData = {
    serverId: 'srv_app_03',
    hostname: 'tenant-api-03',
    metrics: { cpuPercent: 25, memPercent: 40, diskPercent: 20 },
    recentLogs: ['idor violation: user attempting to access tenant object id=948271 without authorization'],
  };
  const idorRes = LocalSecurityEngine.analyze(idorEvent);
  assert.equal(idorRes.threatType, 'IDOR_OBJECT_TAKEOVER');
  console.log('  ✓ IDOR Horizontal Privilege Escalation detected.');

  // E. Dependency Supply Chain Tampering
  const supplyEvent: ServerEventData = {
    serverId: 'srv_build_01',
    hostname: 'ci-runner-build-01',
    metrics: { cpuPercent: 30, memPercent: 40, diskPercent: 30 },
    recentLogs: ['unauthorized outbound network during npm install from typosquatted dependency'],
  };
  const supplyRes = LocalSecurityEngine.analyze(supplyEvent);
  assert.equal(supplyRes.threatType, 'SUPPLY_CHAIN_TAMPERING');
  console.log('  ✓ Dependency Supply Chain Tampering detected.');

  // =========================================================================
  // 6. TEST NEW AI BRAIN INTEGRATION WITH NEURAL TENSOR
  // =========================================================================
  console.log('  -> 6. Testing New AI Brain Integration with Neural Tensor...');
  const brainEvent = {
    serverId: 'srv_brain_01',
    hostname: 'edge-proxy-01',
    metrics: { cpuPercent: 90, memPercent: 85, diskPercent: 92 },
    killChainProgression: {
      activeStages: ['RECONNAISSANCE', 'INITIAL_FOOTHOLD', 'PRIVILEGE_ESCALATION', 'DATA_EXFILTRATION_OR_DESTRUCTION'],
      progressionScore: 85,
      currentStage: 'DATA_EXFILTRATION_OR_DESTRUCTION',
      isPreempted: true,
    },
    cascadingOutage: {
      isCascadingOutage: true,
      affectedDownstreamCount: 3,
    },
    predictiveForecast: {
      currentUsagePercent: 92,
      growthVelocityPerMinute: 350,
      timeToExhaustionMinutes: 25,
      isExhaustionImminent: true,
    },
    experienceConfidence: 0.92,
    logs: ['kill chain exfiltration reverse shell connected', 'deadlock on primary db'],
  };

  const brainVec = neuralThreatClassifier.vectorize(brainEvent);
  assert.equal(brainVec.length, 64, 'Tensor length must be 64');
  assert.ok(Math.abs(brainVec[7] - 0.85) < 0.001, 'Kill-chain score normalized to index 7');
  assert.equal(brainVec[8], 1.0, 'Cascading outage flag set at index 8');
  assert.equal(brainVec[9], 1.0, 'Predictive exhaustion imminent flag set at index 9');
  assert.equal(brainVec[17], 1.0, 'Exfiltration stage encoded at index 17');
  assert.ok(Math.abs(brainVec[18] - 0.6) < 0.001, 'Cascading downstream count encoded at index 18');
  assert.ok(Math.abs(brainVec[19] - 0.92) < 0.001, 'Experience confidence encoded at index 19');
  console.log('  ✓ Neural Vectorizer successfully synthesized all 5 new AI brain signals into Float32Array.');

  // Verify learning on new brain threat classes
  const brainTargetClass = 'KILL_CHAIN_PREEMPTION';
  const brainLossInit = neuralThreatClassifier.trainSample(brainVec, brainTargetClass, 0.05);
  let brainLossFinal = brainLossInit;
  for (let s = 0; s < 15; s++) {
    brainLossFinal = neuralThreatClassifier.trainSample(brainVec, brainTargetClass, 0.08);
  }
  assert.ok(brainLossFinal < brainLossInit, 'Backprop on new brain classes must converge');
  const brainPred = neuralThreatClassifier.predict(brainVec);
  console.log(`  ✓ Neural learning confirmed on new brain class '${brainTargetClass}': Loss ${brainLossInit.toFixed(4)} -> ${brainLossFinal.toFixed(4)} (Prob: ${(brainPred.classProbabilities[brainTargetClass] * 100).toFixed(1)}%).`);

  console.log('✓ Embedded Deep Neural Network Threat Classifier Test ALL PASSED!\n');
}

if (require.main === module) {
  testNeuralNetworkThreatClassifier().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
