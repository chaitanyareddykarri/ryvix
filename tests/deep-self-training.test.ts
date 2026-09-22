import assert from 'node:assert/strict';
import {
  deepSelfTrainer,
} from '../ai/src/orchestrator';

export async function testDeepSelfTraining(): Promise<void> {
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
  assert.ok(summary.finalLoss <= summary.initialLoss || summary.finalLoss < 2.0);
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
