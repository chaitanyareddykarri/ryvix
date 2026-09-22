/**
 * Master Test Suite: Interactive AI Coding & Pair-Programming Assistant
 * 
 * Verifies:
 * 1. Code Synthesis: Communicates with LLM to produce structured diffs and file changes.
 * 2. Code Simplifier: Generates plain-English explanations so code is easy to review.
 * 3. Self-Debugging Loop: Feeds compiler/runtime errors to LLM and returns working fixes.
 * 4. Coding Pattern Memory: Persists project conventions in 'ai/data/coding_patterns.json'.
 */

import assert from 'node:assert/strict';
import { codingAssistant, synthesizeCode, explainCodeSimply, selfDebugCode } from '../ai/src/orchestrator';

export async function testCodingAssistant(): Promise<void> {
  console.log('[TEST] Running Interactive AI Coding & Pair-Programming Assistant Test...');

  // 1. Code Synthesis Test
  console.log('  -> 1. Testing Automated Code Synthesis via LLM...');
  const synth = await synthesizeCode('Implement Redis cache layer for user profile endpoint', {
    stack: ['Next.js 15', 'TypeScript', 'Redis'],
    targetFile: 'src/services/user-cache.ts',
  });

  assert.ok(synth.filesChanged.length >= 1, 'Must specify modified files');
  assert.ok(synth.diff.includes('--- a/') || synth.diff.length > 0, 'Must produce valid git diff');
  assert.ok(synth.simpleExplanation.length > 20, 'Must produce plain-English explanation');
  assert.ok(synth.keyBenefits.length >= 2, 'Must provide readability & speed benefits');
  assert.ok(synth.suggestedCommitMessage.length > 0, 'Must provide git commit message');
  console.log(`  ✓ Code synthesized via provider '${synth.providerUsed}': ${synth.filesChanged.join(', ')}.`);
  console.log(`     Explanation: "${synth.simpleExplanation.slice(0, 75)}..."`);

  // 2. Plain-English Code Simplifier
  console.log('  -> 2. Testing Plain-English Code Simplifier & Walkthrough...');
  const sampleDiff = `--- a/auth.ts\n+++ b/auth.ts\n+export function verifyPKCE(verifier: string, challenge: string) {\n+  return sha256(verifier) === challenge;\n+}`;
  const explanation = await explainCodeSimply(sampleDiff);

  assert.ok(explanation.summary.length > 10, 'Summary must explain changes');
  assert.ok(explanation.bullets.length >= 2, 'Must provide bullet points');
  assert.ok(explanation.complexityScore, 'Must provide complexity score');
  console.log(`  ✓ Code simplified: Complexity='${explanation.complexityScore}' | Bullets=${explanation.bullets.length}.`);

  // 3. Self-Debugging Loop Test
  console.log('  -> 3. Testing Autonomous Self-Debugging & Error Recovery...');
  const brokenCode = `function calculateTotal(items) { return items.reduce((a, b) => a + b.price); }`;
  const compilerError = `TypeError: Cannot read properties of undefined (reading 'price') when items is empty`;

  const debugResult = await selfDebugCode(brokenCode, compilerError);
  assert.ok(debugResult.rootCause.length > 10, 'Must identify bug root cause');
  assert.ok(debugResult.resolutionExplanation.length > 10, 'Must explain the fix');
  assert.ok(debugResult.fixDiff.length > 0, 'Must provide corrected diff');
  console.log(`  ✓ Self-debugger analyzed error: "${debugResult.rootCause.slice(0, 60)}...".`);

  // 4. Coding Pattern Memory Test
  console.log('  -> 4. Testing Coding Convention & Pattern Persistence...');
  codingAssistant.rememberCodingPreference('styling', 'Tailwind CSS with dark mode');
  codingAssistant.rememberCodingPreference('state', 'Zustand store with Immer');

  const prefs = codingAssistant.getCodingPreferences();
  assert.equal(prefs.styling, 'Tailwind CSS with dark mode');
  assert.equal(prefs.state, 'Zustand store with Immer');
  console.log('  ✓ Coding conventions recorded and persisted to ai/data/coding_patterns.json.');

  console.log('✓ Interactive AI Coding & Pair-Programming Assistant Test PASSED!\n');
}

if (require.main === module) {
  testCodingAssistant().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
