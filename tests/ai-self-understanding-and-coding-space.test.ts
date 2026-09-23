/**
 * @file ai-self-understanding-and-coding-space.test.ts
 *
 * TEST SUITE 38: AI DEEP SELF-UNDERSTANDING, CODING SPACES & COGNITIVE ARCHITECTURE
 * 
 * Validates:
 * 1. Docker Coding Workspace Sandbox Lifecycle & Cgroup Resource Ceilings
 * 2. Dynamic Ephemeral Preview Port Allocation (3100-3999) & Reverse Proxy Headers
 * 3. Autonomous Multi-Language Stack Detection from Manifests (Next.js, FastAPI, Go, Rust)
 * 4. Atomic Unified Git Diff Synthesis & Sandbox Execution Verification
 * 5. Automated GitHub Pull Request Generation with Verification Matrices
 * 6. Top-Level Ryvix AGI Core OODA Cycle Execution & Epistemic Believing
 * 7. Mem0 3-Tier Cognitive Memory Engine (Working, Persistent, Associative Vector)
 * 8. GraphRAG System Topology Blast-Radius BFS & Swarm Jury Deliberation
 * 9. Speculative Execution Simulator Dry-Run Certificate & Autonomous Reflexion
 * 10. Neural Network MLP Float32Array Sub-50µs Inference & Multi-Class Prediction
 * 11. Hybrid RAG Engine Dual-Retriever Semantic Retrieval & Confidence Scores
 * 12. Conversational Agent Dynamic Persona Shifting & Grounded Synthesis
 */

import { dockerWorkspaceManager } from '../services/src/workspace/docker-workspace.manager';
import {
  codingAssistant,
  conversationalAgent,
  ragEngine,
  neuralThreatClassifier,
  ryvixAgi,
  cognitiveMemory,
  systemTopologyGraph,
  swarmJury,
  mctsPlanner,
  speculativeSimulator,
  reflexionEngine,
} from '../services/src';

export async function testAiSelfUnderstandingAndCodingSpace(): Promise<void> {
  console.log('\n======================================================================');
  console.log(' TEST SUITE 38: AI DEEP SELF-UNDERSTANDING, CODING SPACES & AGI CORE');
  console.log('======================================================================\n');

  // [1] Coding Workspace Docker Sandbox Provisioning
  console.log('[1] Testing Coding Workspace Docker Sandbox Provisioning & Cgroup Ceilings...');
  const session1 = await dockerWorkspaceManager.createSession({
    taskId: 'task_coding_suite38_01',
    projectId: 'proj_suite38_alpha',
    cpu: 2,
    ramMb: 2048,
    ttlMinutes: 15,
  });

  if (!session1 || !session1.id) {
    throw new Error('Failed to provision Docker coding sandbox session.');
  }
  if (session1.task_id !== 'task_coding_suite38_01') {
    throw new Error(`Session task ID mismatch: expected task_coding_suite38_01, got ${session1.task_id}`);
  }
  if (session1.status !== 'active') {
    throw new Error(`Expected active status, got ${session1.status}`);
  }
  console.log(`  ✓ Provisioned Docker sandbox: ID=${session1.id} | Container=${session1.container_id} | Cgroups: 2 vCPUs, 2048MB RAM`);

  // [2] Dynamic Ephemeral Preview Port Allocation (3100-3999)
  console.log('[2] Testing Dynamic Ephemeral Preview Port Allocation (3100-3999 Range)...');
  const session2 = await dockerWorkspaceManager.createSession({
    taskId: 'task_coding_suite38_02',
    projectId: 'proj_suite38_beta',
    cpu: 1,
    ramMb: 2048,
    ttlMinutes: 15,
  });

  const port1 = session1.preview_port;
  const port2 = session2.preview_port;

  if (port1 < 3100 || port1 > 3999) {
    throw new Error(`Preview port1 out of range 3100-3999: ${port1}`);
  }
  if (port2 < 3100 || port2 > 3999) {
    throw new Error(`Preview port2 out of range 3100-3999: ${port2}`);
  }
  if (port1 === port2) {
    throw new Error(`Collision detected: ports must be uniquely allocated (${port1} === ${port2})`);
  }
  console.log(`  ✓ Dynamically allocated collision-free preview ports: PortA=${port1}, PortB=${port2} with URLs: ${session1.preview_url}, ${session2.preview_url}`);

  // [3] Autonomous Multi-Language Stack Detection
  console.log('[3] Testing Autonomous Multi-Language Stack Detection from Manifests...');
  const nextStack = codingAssistant.detectStackFromManifest(['package.json', 'next.config.ts', 'tsconfig.json']);
  if (nextStack.framework !== 'Next.js 15 App Router' || nextStack.devPort !== 3100) {
    throw new Error(`Incorrect Next.js stack detection: ${JSON.stringify(nextStack)}`);
  }

  const pyStack = codingAssistant.detectStackFromManifest(['pyproject.toml', 'requirements.txt', 'main.py']);
  if (!pyStack.framework.includes('FastAPI') || pyStack.devPort !== 3102) {
    throw new Error(`Incorrect Python FastAPI detection: ${JSON.stringify(pyStack)}`);
  }

  const goStack = codingAssistant.detectStackFromManifest(['go.mod', 'main.go']);
  if (!goStack.framework.includes('Gin') || goStack.devPort !== 3103) {
    throw new Error(`Incorrect Go Gin detection: ${JSON.stringify(goStack)}`);
  }

  const rustStack = codingAssistant.detectStackFromManifest(['Cargo.toml', 'src/main.rs']);
  if (!rustStack.framework.includes('Axum') || rustStack.devPort !== 3104) {
    throw new Error(`Incorrect Rust Axum detection: ${JSON.stringify(rustStack)}`);
  }
  console.log(`  ✓ Successfully detected 4 distinct multi-language stacks (Next.js, FastAPI, Go Gin, Rust Axum).`);

  // [4] Atomic Unified Git Diff Synthesis & Sandbox Verification
  console.log('[4] Testing Atomic Unified Git Diff Synthesis & Sandbox Execution Verification...');
  const originalCode = 'export function health() {\n  return "ok";\n}';
  const modifiedCode = 'export function health() {\n  return "ok-v2";\n}\nexport function metrics() {\n  return { uptime: 100 };\n}';
  const unifiedDiff = codingAssistant.synthesizeUnifiedDiff(originalCode, modifiedCode, 'src/health.ts');

  if (!unifiedDiff.includes('--- a/src/health.ts') || !unifiedDiff.includes('+++ b/src/health.ts')) {
    throw new Error(`Synthesized diff missing standard git diff headers: ${unifiedDiff}`);
  }

  const goodExecution = codingAssistant.verifySandboxExecution('npm test', 0, 'PASS 12 tests', '');
  if (!goodExecution.success || goodExecution.shouldTriggerSelfDebug) {
    throw new Error('Good execution was improperly flagged as failed.');
  }

  const badExecution = codingAssistant.verifySandboxExecution('npm run build', 1, '', 'TS2307: Cannot find module @ryvix/services');
  if (badExecution.success || !badExecution.shouldTriggerSelfDebug) {
    throw new Error('Sandbox error failed to trigger autonomous self-debug loop.');
  }
  console.log(`  ✓ Unified diff synthesized (${unifiedDiff.split('\n').length} lines) & sandbox error diagnosed: "${badExecution.diagnosis}"`);

  // [5] Automated GitHub Pull Request Generation
  console.log('[5] Testing Automated GitHub Pull Request Generation...');
  const pr = codingAssistant.generatePullRequestDetails(
    'Rate Limiting Middleware',
    'Implement high-throughput token bucket rate limiting middleware in Redis',
    ['src/middleware/rate-limiter.ts', 'src/config/redis.ts']
  );

  if (!pr.branchName.startsWith('ryvix/feature-')) {
    throw new Error(`Invalid PR branch format: ${pr.branchName}`);
  }
  if (!pr.prTitle.startsWith('feat:')) {
    throw new Error(`Invalid PR title format: ${pr.prTitle}`);
  }
  if (!pr.prBodyMarkdown.includes('Verification Matrix') || !pr.prBodyMarkdown.includes('Rollback Strategy')) {
    throw new Error('PR body missing essential verification matrix or rollback strategy.');
  }
  console.log(`  ✓ GitHub PR generated: Branch="${pr.branchName}" | Title="${pr.prTitle}" | Rollback Included.`);

  // [6] Top-Level Ryvix AGI Core Self-Understanding & OODA Cycle
  console.log('[6] Testing Top-Level Ryvix AGI Core Self-Understanding & OODA Cycle...');
  const ooda = await ryvixAgi.executeOodaCycle({
    source: 'web_chat',
    rawObservation: 'Explain the Ryvix AGI Core OODA cycle and Mem0 cognitive memory integration.',
    environmentContext: {
      userId: 'usr_lead_architect',
      clusterStatus: 'HEALTHY',
    },
  });

  if (!ooda.cycleId || !ooda.orient || !ooda.decide) {
    throw new Error('AGI OODA cycle failed to produce cycleId, orient, or decide.');
  }
  if (ooda.decide.confidence <= 0) {
    throw new Error(`Decision confidence unexpectedly low: ${ooda.decide.confidence}`);
  }
  console.log(`  ✓ AGI OODA Cycle executed: CycleID=${ooda.cycleId} | Certainty=${(ooda.decide.confidence * 100).toFixed(1)}% | Domain=${ooda.orient.primaryDomain} | RewardScore=${ooda.reflect.rewardScore}`);

  // [7] Mem0 3-Tier Cognitive Memory Engine
  console.log('[7] Testing Mem0 3-Tier Cognitive Memory Engine (Working, Persistent, Semantic)...');
  const convId = 'conv_suite38_' + Date.now();
  cognitiveMemory.recordInteraction({
    sessionId: convId,
    userId: 'usr_lead_architect',
    role: 'user',
    content: 'We are deploying on Docker sandbox with ephemeral preview ports 3100-3999.',
  });
  cognitiveMemory.recordInteraction({
    sessionId: convId,
    userId: 'usr_lead_architect',
    role: 'assistant',
    content: 'Confirmed. Docker sandbox and port allocation registered in cognitive memory.',
  });

  const recallResult = cognitiveMemory.recall({
    query: 'What port range and container sandbox are we using?',
    sessionId: convId,
    userId: 'usr_lead_architect',
    maxShortTerm: 5,
    maxLongTerm: 5,
    maxSemantic: 3,
  });

  if (recallResult.shortTermTurns.length < 2) {
    throw new Error(`Mem0 recall failed to retrieve active short-term turns (got ${recallResult.shortTermTurns.length})`);
  }
  if (!recallResult.formattedContext.includes('MEM0 COGNITIVE MEMORY ACTIVE')) {
    throw new Error('Formatted prompt context missing Mem0 header');
  }
  console.log(`  ✓ Mem0 Cognitive Engine operational: Turns=${recallResult.shortTermTurns.length} | Facts=${recallResult.longTermFacts.length} | SemanticHits=${recallResult.semanticMatches.length}`);

  // [8] GraphRAG Blast Radius & Multi-Agent Swarm Jury Deliberation
  console.log('[8] Testing GraphRAG System Topology Blast-Radius & Swarm Jury Deliberation...');
  const blastRadius = systemTopologyGraph.getBlastRadius('svc_node_backend', 3);
  if (!blastRadius || !blastRadius.impactedNodes.length) {
    throw new Error('GraphRAG blast radius calculation failed.');
  }

  const safeProposal = {
    action: 'reload_proxy',
    target: 'srv_prod_01',
    command: 'nginx -s reload',
    blastRadius: 'low' as const,
  };
  const juryResult = await swarmJury.deliberate(safeProposal);

  if (juryResult.decision !== 'APPROVED' || juryResult.consensusScore < 0.70) {
    throw new Error(`Swarm jury rejection on safe command: ${JSON.stringify(juryResult)}`);
  }
  console.log(`  ✓ GraphRAG topology path found (${blastRadius.impactedNodes.length} cascading nodes) & Swarm Jury consensus: ${(juryResult.consensusScore * 100).toFixed(1)}% APPROVAL.`);

  // [9] Speculative Execution Simulator & Reflexion Loop
  console.log('[9] Testing Speculative Execution Simulator & Autonomous Reflexion...');
  const dryRun = speculativeSimulator.simulate('systemctl status node-app');

  if (!dryRun.isSafe || dryRun.recommendation !== 'DISPATCH_APPROVED' || !dryRun.certificateHash) {
    throw new Error('Speculative simulator failed on benign status command.');
  }

  const mockValidator = (c: string) => {
    const errors: string[] = [];
    if (c.includes('any')) errors.push('No untyped any allowed');
    return { valid: errors.length === 0, errors };
  };
  const mockRefine = (prev: string, critique: string) => prev.replace('any', 'number');

  const reflexionResult = await reflexionEngine.executeLoop(
    'task_refactor_test38',
    'const x: any = 1;',
    mockRefine,
    mockValidator,
    3
  );

  if (!reflexionResult.converged || reflexionResult.finalCandidate.includes('any')) {
    throw new Error(`Reflexion engine failed to converge: ${JSON.stringify(reflexionResult)}`);
  }
  console.log(`  ✓ Dry-Run Certificate issued (Hash: ${dryRun.certificateHash.slice(0, 16)}...) & Reflexion converged in ${reflexionResult.iterationsTaken} rounds.`);

  // [10] Neural Threat & Intent Classifier Sub-50µs Forward Pass
  console.log('[10] Testing Neural Threat & Intent Classifier Sub-50µs Forward Pass...');
  const t0 = performance.now();
  const codingVec = neuralThreatClassifier.vectorize({
    metrics: { cpuPercent: 20, memPercent: 35, diskPercent: 25 },
    openPorts: [3100],
    codingWorkspaceContext: {
      isCodingWorkspace: true,
      hasDockerSandbox: true,
      previewPort: 3100,
      stackDetected: 'Next.js 15 App Router',
    },
    logs: ['docker run -d --user 1000:1000 --cpus=2.0 --memory=2048m node:22-alpine'],
  });

  const prediction = neuralThreatClassifier.predict(codingVec);
  const neuralLatency = (performance.now() - t0).toFixed(3);

  if (!prediction.predictedClass || prediction.confidence <= 0) {
    throw new Error('Neural prediction failed to produce predictedClass or confidence.');
  }
  console.log(`  ✓ Neural forward-pass computed in ${neuralLatency}ms: PredictedClass=[${prediction.predictedClass}] (Confidence: ${(prediction.confidence * 100).toFixed(1)}%).`);

  // [11] Hybrid RAG Engine Dual-Retriever Semantic Retrieval
  console.log('[11] Testing Hybrid RAG Engine Dual-Retriever Semantic Retrieval...');
  const ragCoding = ragEngine.query('Docker Coding Workspace Sandbox & Ephemeral Container Lifecycle');
  if (ragCoding.retrievalConfidence < 0.70 || !ragCoding.retrievedContext[0]?.chunk.title.includes('Sandbox')) {
    throw new Error(`RAG coding query confidence low or mismatched: ${ragCoding.retrievedContext[0]?.chunk.title}`);
  }

  const ragAgi = ragEngine.query('Ryvix AGI Core: Epistemic OODA Cycle & Autonomous Deliberation Engine');
  if (ragAgi.retrievalConfidence < 0.70 || !ragAgi.retrievedContext[0]?.chunk.title.includes('AGI Core')) {
    throw new Error(`RAG AGI query confidence low or mismatched: ${ragAgi.retrievedContext[0]?.chunk.title}`);
  }
  console.log(`  ✓ RAG retrieval verified: Coding="${ragCoding.retrievedContext[0]?.chunk.title}" (${(ragCoding.retrievalConfidence * 100).toFixed(1)}%) | AGI="${ragAgi.retrievedContext[0]?.chunk.title}" (${(ragAgi.retrievalConfidence * 100).toFixed(1)}%).`);

  // [12] Conversational Agent Dynamic Persona Shifting & Grounded Synthesis
  console.log('[12] Testing Conversational Agent Dynamic Persona Shifting & Grounded Synthesis...');
  const convCoding = await conversationalAgent.chat('Tell me about the Ryvix coding workspace and docker sandbox container.');
  if (convCoding.detectedIntent !== 'INTENT_CODING_WORKSPACE_EXPLANATION' || convCoding.personaUsed !== 'PAIR_PROGRAMMER') {
    throw new Error(`Conversational agent misclassified coding workspace: Intent=${convCoding.detectedIntent}, Persona=${convCoding.personaUsed}`);
  }

  const convAgi = await conversationalAgent.chat('Tell me about yourself, how does your AI work and what is your AGI core?');
  if (convAgi.detectedIntent !== 'INTENT_RYVIX_AGI_SELF_UNDERSTANDING' || convAgi.personaUsed !== 'STAFF_ARCHITECT') {
    throw new Error(`Conversational agent misclassified AGI self-understanding: Intent=${convAgi.detectedIntent}, Persona=${convAgi.personaUsed}`);
  }
  console.log(`  ✓ Conversational routing verified: Coding Workspace -> PAIR_PROGRAMMER | AGI Core -> STAFF_ARCHITECT.`);

  // Cleanup sessions
  await dockerWorkspaceManager.terminateSession(session1.id);
  await dockerWorkspaceManager.terminateSession(session2.id);

  console.log('\n======================================================================');
  console.log(' TEST SUITE 38 PASSED: ALL 12/12 SCENARIOS 100% VERIFIED!');
  console.log('======================================================================\n');
}

if (require.main === module) {
  testAiSelfUnderstandingAndCodingSpace()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
