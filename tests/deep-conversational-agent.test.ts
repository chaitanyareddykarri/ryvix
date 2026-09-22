import assert from 'node:assert/strict';
import {
  conversationalAgent,
} from '../ai/src/orchestrator';

export async function testDeepConversationalAgent(): Promise<void> {
  console.log('[TEST] Running Deep Conversational Agent & Tone Shaping Test Suite...');
  conversationalAgent.clearHistory();

  // 1. Test Intent Classification
  console.log('  -> 1. Testing Technical Intent Classification...');
  assert.strictEqual(conversationalAgent.classifyIntent('production is down with 502 bad gateway'), 'INTENT_DEBUG_INCIDENT');
  assert.strictEqual(conversationalAgent.classifyIntent('please write a typescript function for rate limiting'), 'INTENT_SYNTHESIZE_CODE');
  assert.strictEqual(conversationalAgent.classifyIntent('deploy and configure zero trust ingress firewall'), 'INTENT_EXECUTE_TASK_DAG');
  assert.strictEqual(conversationalAgent.classifyIntent('audit our sshd config and scan for vulnerabilities'), 'INTENT_SECURITY_AUDIT');
  assert.strictEqual(conversationalAgent.classifyIntent('how does distributed consensus work in raft?'), 'INTENT_EXPLAIN_ARCHITECTURE');
  console.log('  ✓ 5/5 Conversational intents accurately classified.');

  // 2. Test Persona & Tone Shaping
  console.log('  -> 2. Testing Adaptive Persona & Tone Shaping...');

  // A. Incident Commander Tone
  const icResponse = await conversationalAgent.chat('URGENT: primary database is locked with deadlocks and app is down!');
  assert.strictEqual(icResponse.personaUsed, 'INCIDENT_COMMANDER');
  assert.strictEqual(icResponse.detectedIntent, 'INTENT_DEBUG_INCIDENT');
  assert.ok(icResponse.message.includes('INCIDENT PRIORITY 1 ALERT'));
  assert.ok(icResponse.actionableArtifacts?.some((a) => a.type === 'COMMAND'));
  console.log('  ✓ Incident Commander tone verified: Terse, high-urgency stabilization sequence dispatched.');

  // B. Staff Architect Tone
  const archResponse = await conversationalAgent.chat(
    'What are the distributed system trade-offs between sync gRPC and async Kafka?'
  );
  assert.strictEqual(archResponse.personaUsed, 'STAFF_ARCHITECT');
  assert.ok(archResponse.message.includes('Architectural Principle'));
  console.log('  ✓ Staff Architect tone verified: Deep trade-offs and CAP resilience explained.');

  // C. Pair-Programmer Tone
  const pairResponse = await conversationalAgent.chat(
    'Can you write a typescript cache wrapper with error handling?',
    'PAIR_PROGRAMMER'
  );
  assert.strictEqual(pairResponse.personaUsed, 'PAIR_PROGRAMMER');
  assert.strictEqual(pairResponse.detectedIntent, 'INTENT_SYNTHESIZE_CODE');
  assert.ok(pairResponse.actionableArtifacts?.some((a) => a.language === 'typescript'));
  console.log('  ✓ Pair-Programmer tone verified: Typed, modular TypeScript code synthesized.');

  // 3. Multi-Turn Conversation History
  console.log('  -> 3. Verifying Multi-Turn Conversation History Persistence...');
  const history = conversationalAgent.getHistory();
  assert.strictEqual(history.length, 6); // 3 user + 3 assistant
  console.log(`  ✓ Multi-turn history verified: ${history.length} dialogue turns preserved.`);

  console.log('✓ Deep Conversational Agent & Tone Shaping Test Suite ALL PASSED!\n');
}

if (require.main === module) {
  testDeepConversationalAgent().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
