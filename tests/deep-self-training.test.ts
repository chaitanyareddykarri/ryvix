import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DeepSelfTrainer } from '../ai/src/deep-self-trainer';
import { NeuralThreatClassifier, neuralThreatClassifier } from '../ai/src/neural-network';

export async function testDeepSelfTraining(): Promise<void> {
  const sharedBefore = neuralThreatClassifier.exportWeights();
  const classifier = new NeuralThreatClassifier();
  const before = classifier.exportWeights();
  const deepSelfTrainer = new DeepSelfTrainer(mkdtempSync(join(tmpdir(), 'ryvix-training-test-')), classifier);
  console.log('[TEST] Running Deep Self-Training & Meta-Learning Engine Test Suite...');

  // 1. Test Synthetic Perturbation Generation
  console.log('  -> 1. Testing Autonomous Synthetic Perturbation Generation...');
  const perturbations = deepSelfTrainer.generatePerturbations('SYN_FLOOD_DDOS', 4);
  assert.strictEqual(perturbations.length, 4);
  for (const p of perturbations) {
    assert.strictEqual(p.baseThreat, 'SYN_FLOOD_DDOS');
    assert.ok(p.syntheticMetrics.cpuPercent >= 10);
    assert.ok(p.syntheticLogs.length >= 2);
    assert.ok(p.rewardScore >= 0.8, `Expected reward >= 0.8, got ${p.rewardScore}`);
  }
  console.log(`  ✓ Generated ${perturbations.length} synthetic variations with realistic network/CPU jitter.`);

  // 2. Test Self-Critique Reward Model
  console.log('  -> 2. Testing Self-Critique Reward Model Evaluation...');
  const reward = deepSelfTrainer.evaluateSelfCritiqueReward(perturbations[0]);
  assert.ok(reward >= 0.8 && reward <= 1.0);
  console.log(`  ✓ Self-Critique Reward Model verified: Safety & blast-radius score: ${reward}.`);

  // 3. Test Meta-Learning Cycle with Adam Optimizer
  console.log('  -> 3. Testing Continuous Meta-Learning Cycle with Adam Optimizer...');
  const summary = deepSelfTrainer.executeMetaLearningCycle(
    ['SQL_INJECTION', 'SYN_FLOOD_DDOS', 'KILL_CHAIN_PREEMPTION'],
    2
  );

  assert.ok(summary.syntheticSamplesTrained >= 9);
  assert.strictEqual(summary.epochsCompleted, 2);
  // Two stochastic epochs do not guarantee decreasing loss. Verify real updates,
  // finite measured losses, disk persistence, and isolation from runtime weights.
  assert.ok(Number.isFinite(summary.initialLoss) && summary.initialLoss >= 0);
  assert.ok(Number.isFinite(summary.finalLoss) && summary.finalLoss >= 0);
  assert.notDeepEqual(classifier.exportWeights(), before);
  assert.deepEqual(JSON.parse(readFileSync(summary.persistedWeightsPath, 'utf8')), classifier.exportWeights());
  assert.deepEqual(neuralThreatClassifier.exportWeights(), sharedBefore);
  assert.ok(summary.averageRewardScore >= 0.8);
  assert.ok(summary.durationMs < 500);
  console.log(`  ✓ Meta-Learning Cycle complete: ${summary.syntheticSamplesTrained} samples trained in ${summary.durationMs}ms (Loss: ${summary.initialLoss} -> ${summary.finalLoss}).`);
  console.log(`  ✓ Updated weights persisted to: ${summary.persistedWeightsPath}`);

  console.log('✓ Deep Self-Training & Meta-Learning Engine Test Suite ALL PASSED!\n');
}

if (require.main === module) {
  testDeepSelfTraining().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
