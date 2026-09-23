import assert from 'node:assert/strict';
import { ModelGateway, generateTaskPlan } from '../ai/src/orchestrator';

export async function testAIModelGateway() {
  console.log('[TEST] Running Multi-Provider LLM Gateway and Rate-Limit Failover Test...');

  const gateway = new ModelGateway();

  // =========================================================================
  // 1. PROVIDER CHAIN INITIALIZATION
  // =========================================================================
  console.log('  -> 1. Testing Default Provider Hierarchy and Priority...');
  const providers = gateway.getProviders();
  assert.equal(providers.length, 6, 'Must initialize 6 multi-tier providers');

  assert.equal(providers[0].id, 'groq', 'Primary provider should be Groq (ultra-fast live inference)');
  assert.equal(providers[1].id, 'openai', 'Secondary provider should be OpenAI (GPT-4o-mini)');
  assert.equal(providers[2].id, 'claude', 'Tertiary provider should be Anthropic Claude (3.5 Sonnet)');
  assert.equal(providers[3].id, 'gemini', 'Fourth provider should be Google Gemini');
  assert.equal(providers[4].id, 'huggingface', 'Fifth provider should be Hugging Face Serverless');
  assert.equal(providers[5].id, 'ollama', 'Sixth provider should be Local Ollama');

  console.log('  ✓ Provider hierarchy verified: Groq -> OpenAI -> Claude -> Gemini -> Hugging Face -> Ollama.');

  // =========================================================================
  // 2. RATE LIMIT (HTTP 429) and DYNAMIC FAILOVER TEST
  // =========================================================================
  console.log('  -> 2. Testing Automatic 429 Rate-Limit Detection and Switching...');

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

  console.log('  ✓ Rate-limit failover verified: Groq (429) -> switched to next provider successfully without user disruption.');

  // =========================================================================
  // 2b. ACTIVE COOLDOWN VERIFICATION (SUBSEQUENT CALL SKIPS RATE-LIMITED API)
  // =========================================================================
  console.log('  -> 2b. Testing Active 429 Cooldown (Auto-Skip Rate-Limited Provider)...');
  const secondCallRes = await gateway.complete(
    [{ role: 'user', content: 'Analyze database query latency spike' }]
  );
  assert.ok(
    secondCallRes.failedProviders.some((p) => p.includes('groq (cooling down until')),
    'Subsequent calls during cooldown must automatically skip Groq without wasting an API call'
  );
  console.log('  ✓ Cooldown skip verified: Rate-limited API bypassed during cooldown period.');

  // =========================================================================
  // 3. MULTI-TIER EXHAUSTION and DETERMINISTIC LOCAL ENGINE FALLBACK
  // =========================================================================
  console.log('  -> 3. Testing Cascading Outage Resilience and Deterministic Fallback...');

  const freshGateway = new ModelGateway();

  // Simulate all cloud providers experiencing outages (Groq 429, OpenAI 429, Claude 429, Gemini 429, HF 503)
  const cascadeRes = await freshGateway.complete(
    [{ role: 'user', content: 'Fix crash in payment webhook endpoint' }],
    {
      mockProviderFailures: {
        groq: 429,
        openai: 429,
        claude: 429,
        gemini: 429,
        huggingface: 503,
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

  console.log('  ? generateTaskPlan() created steps successfully.');
  console.log('✓ Multi-Provider LLM Gateway and Rate-Limit Failover Test PASSED!\n');
}
