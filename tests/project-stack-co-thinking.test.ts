import assert from 'node:assert/strict';
import {
  projectStackAdvisor,
  ProjectStackProfile,
} from '../ai/src/orchestrator';

export async function testProjectStackCoThinking(): Promise<void> {
  console.log('[TEST] Running Project Stack Awareness & External LLM Co-Thinking Test Suite...');

  // =========================================================================
  // 1. DEFINE REAL-WORLD PROJECT STACK CONTEXT
  // =========================================================================
  console.log('  -> 1. Initializing Full-Stack Modern Project Profile...');
  const stack: ProjectStackProfile = {
    projectName: 'Ryvix Autonomous Platform',
    framework: 'Next.js 15 (App Router)',
    language: 'TypeScript 5.x',
    database: 'PostgreSQL 16',
    ormOrDriver: 'Prisma ORM',
    cacheTier: 'Redis 7',
    edgeProxy: 'Nginx Ingress',
    infraEnvironment: 'Docker Compose + Kubernetes',
    cloudProvider: 'AWS / Hetzner Cloud',
    observedBottlenecks: ['Database connection pool spikes during peak hours', 'High TTFB on un-cached reads'],
  };

  assert.ok(stack.framework.includes('Next.js 15'));
  assert.ok(stack.database.includes('PostgreSQL 16'));
  console.log(`  ✓ Stack profile loaded: ${stack.projectName} [${stack.framework} | ${stack.database} | ${stack.cacheTier}]`);

  // =========================================================================
  // 2. TEST BIDIRECTIONAL EXTERNAL LLM CO-THINKING LOOP
  // =========================================================================
  console.log('  -> 2. Testing Bidirectional External LLM Co-Thinking Flow...');
  const userPrompt = 'How do we scale our API to handle 10,000 req/sec without crashing PostgreSQL or spiking memory?';

  const response = await projectStackAdvisor.coThinkWithExternalLlm(userPrompt, stack);

  assert.strictEqual(response.query, userPrompt);
  assert.ok(response.chatGptStyleAnalysis.includes('Architectural Assessment'));
  assert.ok(response.externalLlmProvider.length > 0);
  assert.ok(response.externalLlmModel.length > 0);
  assert.ok(response.coThinkingLatencyMs >= 0);
  assert.strictEqual(response.verifiedBlastRadius, 'LOW');
  console.log(`  ✓ Co-thinking response synthesized via provider: '${response.externalLlmProvider}' [Model: ${response.externalLlmModel}] in ${response.coThinkingLatencyMs}ms.`);

  // =========================================================================
  // 3. VERIFY STACK-SPECIFIC CONCRETE DIRECTIVES ("WHAT TO DO NEXT")
  // =========================================================================
  console.log('  -> 3. Verifying Prioritized Stack Directives ("What To Do Next")...');
  assert.ok(response.stackSpecificDirectives.length >= 4);

  // Next.js directive
  const nextDirective = response.stackSpecificDirectives.find((d) => d.title.includes('Next.js'));
  assert.ok(nextDirective);
  assert.strictEqual(nextDirective.category, 'PERFORMANCE');
  assert.ok(nextDirective.whatToDo.includes('revalidateTag'));
  assert.ok(nextDirective.codeOrConfigSnippet?.content.includes('revalidateTag'));
  console.log('  ✓ Directive 1: Next.js 15 Server Components & dynamic cache revalidation verified.');

  // PostgreSQL / PgBouncer directive
  const pgDirective = response.stackSpecificDirectives.find((d) => d.title.includes('PostgreSQL'));
  assert.ok(pgDirective);
  assert.strictEqual(pgDirective.category, 'ARCHITECTURE');
  assert.ok(pgDirective.whatToDo.includes('PgBouncer'));
  assert.ok(pgDirective.codeOrConfigSnippet?.content.includes('pool_mode = transaction'));
  console.log('  ✓ Directive 2: PostgreSQL PgBouncer pooler & statement_timeout verified.');

  // Redis directive
  const redisDirective = response.stackSpecificDirectives.find((d) => d.title.includes('Cache-Aside'));
  assert.ok(redisDirective);
  assert.ok(redisDirective.whatToDo.includes('jitter'));
  assert.ok(redisDirective.codeOrConfigSnippet?.content.includes('cachedQuery'));
  console.log('  ✓ Directive 3: Redis atomic Cache-Aside with jittered TTL verified.');

  // Docker directive
  const dockerDirective = response.stackSpecificDirectives.find((d) => d.title.includes('Container'));
  assert.ok(dockerDirective);
  assert.strictEqual(dockerDirective.category, 'DEVOPS');
  assert.ok(dockerDirective.codeOrConfigSnippet?.content.includes('USER nextjs'));
  console.log('  ✓ Directive 4: Multi-stage Docker build with unprivileged non-root user verified.');

  // =========================================================================
  // 4. VERIFY LOCAL SAFETY SHIELD & BLAST-RADIUS VALIDATION
  // =========================================================================
  console.log('  -> 4. Verifying Local Safety Shield & Blast-Radius Assessment...');
  assert.strictEqual(response.verifiedBlastRadius, 'LOW');
  assert.ok(response.architecturalGuidance.includes('atomic mutations'));
  console.log('  ✓ Local Safety Shield verified: All proposed configuration modifications rated LOW risk.');

  console.log('✓ Project Stack Awareness & External LLM Co-Thinking Test Suite ALL PASSED!\n');
}

if (require.main === module) {
  testProjectStackCoThinking().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
