/**
 * @file cognitive-memory.test.ts
 * @module tests
 *
 * TEST SUITE 36: MEM0 3-TIER COGNITIVE MEMORY ARCHITECTURE
 * 
 * Verifies:
 * 1. Short-Term Working Memory (Sliding Window, Scratchpad, Session Isolation)
 * 2. Long-Term Persistent Memory (Fact Learning, Auto-Extraction, Entity Scoping)
 * 3. Semantic Associative Memory (64-D Vector Embedding, Cosine Similarity)
 * 4. Unified Mem0 Cognitive Engine (360-Degree Recall, Prompt Formatting, Distillation)
 * 5. Top-Level AGI & Chat API Integration (Live OODA Cycle Memory Retention)
 */

import {
  shortTermMemory,
  ShortTermMemoryManager,
  longTermMemory,
  LongTermMemoryManager,
  semanticMemory,
  SemanticMemoryManager,
  cognitiveMemory,
  CognitiveMemoryEngine,
  ryvixAgi
} from '../services/src';

export async function testCognitiveMemory(): Promise<void> {
  console.log('\n======================================================================');
  console.log(' TEST SUITE 36: MEM0 3-TIER COGNITIVE MEMORY ARCHITECTURE');
  console.log('======================================================================\n');

  // -------------------------------------------------------------
  // [1] SHORT-TERM WORKING MEMORY TESTS
  // -------------------------------------------------------------
  console.log('[1] Testing Short-Term Working Memory (Sliding Window & Scratchpad)...');
  const customShortTerm = new ShortTermMemoryManager({ maxTurnsPerSession: 3 });
  const testSession = 'sess_test_' + Date.now();

  customShortTerm.recordTurn(testSession, 'user', 'Turn 1: Hello');
  customShortTerm.recordTurn(testSession, 'assistant', 'Turn 2: How can I help?');
  customShortTerm.recordTurn(testSession, 'user', 'Turn 3: Fix my database');
  customShortTerm.recordTurn(testSession, 'assistant', 'Turn 4: Checking DB'); // Should evict Turn 1

  const recent = customShortTerm.getRecentTurns(testSession);
  if (recent.length !== 3) {
    throw new Error(`Short-term memory expected 3 turns after sliding window eviction, got ${recent.length}`);
  }
  if (recent[0].content !== 'Turn 2: How can I help?' || recent[2].content !== 'Turn 4: Checking DB') {
    throw new Error('Short-term sliding window eviction order incorrect');
  }

  // Scratchpad
  customShortTerm.setScratchpad(testSession, 'activeFile', 'web/app/login/page.tsx');
  const activeFile = customShortTerm.getScratchpad(testSession, 'activeFile');
  if (activeFile !== 'web/app/login/page.tsx') {
    throw new Error(`Scratchpad failed to retain activeFile: ${activeFile}`);
  }

  console.log('  ✓ Short-term working memory sliding window (max 3 turns) & scratchpad validated.');

  // -------------------------------------------------------------
  // [2] LONG-TERM PERSISTENT MEMORY TESTS
  // -------------------------------------------------------------
  console.log('[2] Testing Long-Term Persistent Memory (Fact Learning & Extraction)...');
  const testUserId = 'usr_tester_' + Math.random().toString(36).slice(2, 6);

  // Manual Upsert
  longTermMemory.upsertFact(
    testUserId,
    'User prefers TypeScript and Vanilla CSS with dark mode aesthetics',
    'USER_PREFERENCE',
    0.98,
    ['typescript', 'css', 'darkmode']
  );

  // Auto-Extraction from natural language
  const extracted = longTermMemory.extractFactsFromInteraction(
    testUserId,
    'I prefer to use PostgreSQL on port 5432 and always use 6-digit OTP for logins.'
  );

  if (extracted.length === 0) {
    throw new Error('Long-term memory failed to extract facts from natural language interaction');
  }

  const userFacts = longTermMemory.getFactsForEntity(testUserId);
  if (userFacts.length < 2) {
    throw new Error(`Expected at least 2 long-term facts for entity ${testUserId}, found ${userFacts.length}`);
  }

  // Search facts by query
  const searchResults = longTermMemory.searchFacts(testUserId, 'PostgreSQL port', 3);
  if (searchResults.length === 0) {
    throw new Error('Long-term memory search failed to find relevant fact for query');
  }

  console.log(`  ✓ Long-term memory validated (${userFacts.length} facts registered, auto-extraction successful).`);

  // -------------------------------------------------------------
  // [3] SEMANTIC ASSOCIATIVE VECTOR MEMORY TESTS
  // -------------------------------------------------------------
  console.log('[3] Testing Semantic Associative Vector Memory (64-D Cosine Retrieval)...');
  
  // Test embedding generation
  const vec1 = semanticMemory.embedText('6-digit email OTP verification authentication');
  const vec2 = semanticMemory.embedText('login security email passcode');
  const vec3 = semanticMemory.embedText('vegetable garden carrot potato');

  if (vec1.length !== 64 || vec2.length !== 64) {
    throw new Error(`Expected 64-dimensional float vector, got ${vec1.length}`);
  }

  const simRelated = semanticMemory.computeCosineSimilarity(vec1, vec2);
  const simUnrelated = semanticMemory.computeCosineSimilarity(vec1, vec3);

  if (simRelated <= simUnrelated) {
    throw new Error(`Semantic similarity failed: related (${simRelated}) <= unrelated (${simUnrelated})`);
  }

  // Store and recall concept
  semanticMemory.remember(
    'Zero-Downtime Blue-Green Deployment',
    'Rolling container switch with healthcheck verification on upstream socket prevents dropped connections.',
    'ARCHITECTURE',
    ['deploy', 'docker', 'bluegreen']
  );

  const semanticHits = semanticMemory.recall('how to update container without downtime', 3);
  if (semanticHits.length === 0) {
    throw new Error('Semantic memory recall returned 0 matches for associative query');
  }

  console.log(`  ✓ Semantic memory 64-D vector projection validated (Top match: "${semanticHits[0].item.title}", Similarity: ${(semanticHits[0].similarity * 100).toFixed(1)}%).`);

  // -------------------------------------------------------------
  // [4] UNIFIED MEM0 COGNITIVE ENGINE TESTS
  // -------------------------------------------------------------
  console.log('[4] Testing Unified Mem0 Cognitive Engine (360-Degree Recall & Distillation)...');
  const convId = 'conv_mem0_' + Date.now();

  // Record interaction
  cognitiveMemory.recordInteraction({
    sessionId: convId,
    userId: testUserId,
    role: 'user',
    content: 'We are using Next.js 15 App Router and Supabase Auth.'
  });

  cognitiveMemory.recordInteraction({
    sessionId: convId,
    userId: testUserId,
    role: 'assistant',
    content: 'I have logged your Next.js 15 and Supabase Auth configuration.'
  });

  // Recall across all 3 tiers
  const recallResult = cognitiveMemory.recall({
    query: 'What auth and frontend stack are we using?',
    sessionId: convId,
    userId: testUserId,
    maxShortTerm: 5,
    maxLongTerm: 5,
    maxSemantic: 3
  });

  if (recallResult.shortTermTurns.length < 2) {
    throw new Error(`Recall failed to retrieve active short-term turns (got ${recallResult.shortTermTurns.length})`);
  }

  if (recallResult.longTermFacts.length === 0) {
    throw new Error('Recall failed to retrieve long-term facts');
  }

  if (!recallResult.formattedContext.includes('MEM0 COGNITIVE MEMORY ACTIVE')) {
    throw new Error('Formatted prompt context missing Mem0 header');
  }

  // Session distillation
  const distillation = cognitiveMemory.distillSession(convId, testUserId);
  if (!distillation.summaryCreated) {
    throw new Error('Session distillation failed to produce summary');
  }

  console.log('  ✓ Unified Mem0 Cognitive Engine 360-degree recall and prompt formatting verified.');

  // -------------------------------------------------------------
  // [5] TOP-LEVEL AGI OODA CYCLE MEMORY INTEGRATION
  // -------------------------------------------------------------
  console.log('[5] Testing Top-Level AGI OODA Cycle Live Memory Retention...');
  const oodaResult = await ryvixAgi.executeOodaCycle({
    source: 'unit_test',
    rawObservation: 'Website is throwing 502 Bad Gateway on port 3000',
    environmentContext: {
      conversationId: convId,
      userId: testUserId,
      service: 'web-frontend',
      reportedStatus: 502
    }
  });

  if (!oodaResult.memoryRecall) {
    throw new Error('AgiCore executeOodaCycle did not return memoryRecall context');
  }

  if (oodaResult.memoryRecall.query !== 'Website is throwing 502 Bad Gateway on port 3000') {
    throw new Error('AgiCore memory recall query mismatch');
  }

  const memoryTurnsAfterOoda = shortTermMemory.getRecentTurns(convId);
  if (memoryTurnsAfterOoda.length === 0) {
    throw new Error('AgiCore executeOodaCycle failed to record observation in short-term working memory');
  }

  console.log('  ✓ Top-Level AGI OODA cycle live memory retention verified (Cycle: ' + oodaResult.cycleId + ').');

  console.log('\n======================================================================');
  console.log(' TEST SUITE 36 PASSED: 100% OPERATIONAL MEM0 COGNITIVE MEMORY!');
  console.log('======================================================================\n');
}

// Direct execution CLI runner
if (require.main === module) {
  testCognitiveMemory().catch((err) => {
    console.error('Test Suite 36 Failed:', err);
    process.exit(1);
  });
}
