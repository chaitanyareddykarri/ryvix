import assert from 'node:assert/strict';
import {
  generalIntelligenceEngine,
  ProblemScenario,
  HighLevelGoal,
} from '../ai/src/orchestrator';

export async function testGeneralIntelligence(): Promise<void> {
  console.log('[TEST] Running Autonomous General Intelligence (AGI) Test Suite...');

  // =========================================================================
  // 1. MULTI-STEP DEDUCTIVE REASONING & HYPOTHESIS EVALUATION
  // =========================================================================
  console.log('  -> 1. Testing Deductive Multi-Step Reasoning Engine...');
  const scenario: ProblemScenario = {
    title: 'Cluster Intermittent 502s with Spiking Memory',
    observedSymptoms: ['HTTP 502 Bad Gateway observed on web edge', 'Node backend memory usage > 95%'],
    errorLogs: [
      'nginx: connect() failed (111: Connection refused) while connecting to upstream',
      'kernel: Out of memory: Kill process 19284 (node) score 850',
    ],
    metricAnomalies: ['RAM usage 98%', 'Swap 100%'],
  };

  const deduction = generalIntelligenceEngine.reasonAboutProblem(scenario);
  assert.ok(deduction.primaryHypothesis.includes('Memory Exhaustion'));
  assert.ok(deduction.confidence >= 0.9);
  assert.ok(deduction.competingHypotheses.length >= 2);
  assert.ok(deduction.executableRemedySequence.length >= 1);
  assert.ok(deduction.architecturalLessonLearned.includes('cgroups'));
  console.log(`  ✓ Multi-step deduction verified: Primary="${deduction.primaryHypothesis}" (Confidence: ${(deduction.confidence * 100).toFixed(0)}%).`);
  console.log(`    Evaluated ${deduction.competingHypotheses.length} competing hypotheses; blast radius assessed as ${deduction.blastRadius.riskLevel}.`);

  // =========================================================================
  // 2. AUTONOMOUS GOAL DECOMPOSITION INTO TASK DAG
  // =========================================================================
  console.log('  -> 2. Testing Autonomous Goal Decomposition & Task DAG Synthesis...');
  const secGoal: HighLevelGoal = {
    objective: 'Harden entire host infrastructure and establish zero-trust ingress control',
    domain: 'SECURITY',
    targetEnvironment: 'PRODUCTION',
  };

  const dag = generalIntelligenceEngine.decomposeGoal(secGoal);
  assert.strictEqual(dag.tasks.length, 3);
  assert.strictEqual(dag.tasks[0].phase, 'DISCOVERY');
  assert.strictEqual(dag.tasks[1].phase, 'EXECUTION');
  assert.strictEqual(dag.tasks[2].phase, 'HARDENING');
  assert.deepStrictEqual(dag.topologicalExecutionOrder, ['task-1-discovery', 'task-2-firewall', 'task-3-ssh-hardening']);
  assert.ok(dag.estimatedDurationMinutes > 0);
  assert.ok(dag.rollbackStrategy.length > 20);
  console.log(`  ✓ Goal decomposed into ${dag.tasks.length} topological phases (Duration: ~${dag.estimatedDurationMinutes}m).`);

  // =========================================================================
  // 3. COUNTERFACTUAL RISK & BLAST-RADIUS ASSESSMENT
  // =========================================================================
  console.log('  -> 3. Testing Counterfactual Risk & Blast-Radius Assessment...');
  // Critical command
  const criticalAssessment = generalIntelligenceEngine.assessBlastRadius(['rm -rf /var/lib/data/*', 'systemctl restart app']);
  assert.strictEqual(criticalAssessment.riskLevel, 'CRITICAL');
  assert.strictEqual(criticalAssessment.dataLossRisk, true);
  assert.strictEqual(criticalAssessment.downtimeRisk, true);
  assert.ok(criticalAssessment.preFlightSafetyChecks.length >= 3);

  // Safe command
  const safeAssessment = generalIntelligenceEngine.assessBlastRadius(['sysctl -w net.core.somaxconn=65535']);
  assert.strictEqual(safeAssessment.riskLevel, 'LOW');
  assert.strictEqual(safeAssessment.dataLossRisk, false);
  console.log('  ✓ Blast-radius safely segregated: Destructive commands marked CRITICAL; benign configs marked LOW.');

  // =========================================================================
  // 4. CONVERSATIONAL POLYGLOT ADVISORY & TRADE-OFF REASONING
  // =========================================================================
  console.log('  -> 4. Testing Conversational Polyglot Advisory & Architectural Reasoning...');
  const advice = generalIntelligenceEngine.consultAdvisor('Should I use Redis Cache-Aside or Write-Through for our user profile API?');
  assert.ok(advice.directAnswer.length > 50);
  assert.strictEqual(advice.tradeOffs.length, 2);
  assert.ok(advice.polyglotSnippet);
  assert.strictEqual(advice.polyglotSnippet.language, 'typescript');
  assert.ok(advice.polyglotSnippet.code.includes('redis.get'));
  assert.ok(advice.architecturalPrinciple.includes('maxmemory'));
  console.log(`  ✓ Advisory response verified: Trade-offs evaluated across ${advice.tradeOffs.length} patterns with TypeScript snippet.`);

  console.log('✓ Autonomous General Intelligence (AGI) Test Suite ALL PASSED!\n');
}

if (require.main === module) {
  testGeneralIntelligence().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
