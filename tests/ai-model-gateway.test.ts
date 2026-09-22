import assert from 'node:assert/strict';
import { ModelGateway, generateTaskPlan } from '../ai/src/orchestrator';

export async function testAIModelGateway() {
  console.log('[TEST] Running Multi-Provider LLM Gateway & Rate-Limit Failover Test...');

  const gateway = new ModelGateway();

  // =========================================================================
  // 1. PROVIDER CHAIN INITIALIZATION
  // =========================================================================
  console.log('  -> 1. Testing Default Provider Hierarchy & Priority...');
  const providers = gateway.getProviders();
  assert.equal(providers.length, 4, 'Must initialize 4 multi-tier providers');

  assert.equal(providers[0].id, 'groq', 'Primary provider should be Groq (fastest free tier)');
  assert.equal(providers[1].id, 'huggingface', 'Secondary provider should be Hugging Face');
  assert.equal(providers[2].id, 'gemini', 'Tertiary provider should be Google Gemini');
  assert.equal(providers[3].id, 'ollama', 'Fourth provider should be Local Ollama');

  console.log('  ✓ Provider hierarchy verified: Groq -> Hugging Face -> Gemini -> Ollama.');

  // =========================================================================
  // 2. RATE LIMIT (HTTP 429) & DYNAMIC FAILOVER TEST
  // =========================================================================
  console.log('  -> 2. Testing Automatic 429 Rate-Limit Detection & Switching...');

  // Simulate Groq hitting 429 Rate Limit (e.g. daily quota reached)
  const failoverRes = await gateway.complete(
    [{ role: 'user', content: 'Generate task plan for Next.js auth refactor' }],
    {
      mockProviderFailures: {
        groq: 429, // Groq rate-limited!
      },
    }
  );

  assert.equal(failoverRes.failoverOccurred, true, 'Failover flag must be set when primary provider hits 429');
  assert.ok(
    failoverRes.failedProviders.some((p) => p.includes('groq (HTTP 429')),
    'Failed providers list must document Groq 429 rate limit'
  );
  assert.ok(failoverRes.content.length > 0, 'Completion must successfully return content via failover');

  console.log(`  ✓ Rate-limit failover verified: Groq (429) -> switched successfully without user disruption.`);

  // =========================================================================
  // 3. MULTI-TIER EXHAUSTION & DETERMINISTIC LOCAL ENGINE FALLBACK
  // =========================================================================
  console.log('  -> 3. Testing Cascading Outage Resilience & Deterministic Fallback...');

  // Simulate all cloud providers experiencing outages (Groq 429, HF 503, Gemini 500)
  const cascadeRes = await gateway.complete(
    [{ role: 'user', content: 'Fix crash in payment webhook endpoint' }],
    {
      mockProviderFailures: {
        groq: 429,
        huggingface: 503,
        gemini: 500,
      },
    }
  );

  assert.equal(cascadeRes.failoverOccurred, true);
  assert.equal(cascadeRes.providerUsed, 'local_deterministic_engine', 'Must fall back to deterministic local engine');
  assert.ok(cascadeRes.content.includes('payment webhook'), 'Local engine must generate relevant structured plan');

  console.log('  ✓ Zero-outage local fallback verified under multi-cloud provider outages.');

  // =========================================================================
  // 4. STRUCTURED TASK PLAN GENERATION TEST
  // =========================================================================
  console.log('  -> 4. Testing End-to-End generateTaskPlan() Integration...');

  const plan = await generateTaskPlan({
    taskId: 'task_llm_verify_99',
    projectId: 'proj_ecommerce_prod',
    userPrompt: 'Add Redis cache to product catalog API and write vitest tests',
    projectContext: {
      stack: ['nextjs', 'typescript'],
      framework: 'Next.js 14',
    },
  });

  assert.ok(plan.planTitle.length > 0, 'Plan title must be generated');
  assert.ok(plan.steps.length >= 2, 'Plan must generate structured PlanSteps');
  assert.equal(plan.steps[0].step_number, 1);
  assert.ok(plan.steps[0].title.length > 0);
  assert.ok(plan.steps[0].suggested_tool, 'Steps must propose suggested tool calls');
  assert.ok(plan.providerUsed, 'Plan must indicate provider used');

  console.log(`  ✓ generateTaskPlan() created ${plan.steps.length} steps via provider '${plan.providerUsed}'.`);
  console.log('✓ Multi-Provider LLM Gateway & Rate-Limit Failover Test PASSED!\n');
}
