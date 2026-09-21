import { testServerOutage } from './server-outage.test';
import { testSelfHealingFlow } from './self-healing.test';
import { testCircuitBreakerFlow } from './circuit-breaker.test';
import { testWorkspaceCleanupFlow } from './workspace-cleanup.test';
import { testApiKeySecurity } from './api-keys.test';
import { testCrossTenantRls } from './cross-tenant-rls.test';

async function runAllTests() {
  console.log('============================================================');
  console.log('RYVIX RUNTIME ARCHITECTURE & DATABASE TEST SUITE');
  console.log('============================================================\n');

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  const testCases: { name: string; fn: () => Promise<void> }[] = [
    { name: 'Server Outage & Differential Diagnosis', fn: testServerOutage },
    { name: 'Self-Healing Engine & Resolution', fn: testSelfHealingFlow },
    { name: '3-Attempt Circuit Breaker & Escalation', fn: testCircuitBreakerFlow },
    { name: 'Workspace Expiry & Docker Teardown', fn: testWorkspaceCleanupFlow },
    { name: 'API Key Cryptographic Security & Scopes', fn: testApiKeySecurity },
    { name: 'Cross-Tenant RLS & Audit Immutability', fn: testCrossTenantRls },
  ];

  for (const tc of testCases) {
    try {
      await tc.fn();
      passed++;
    } catch (err: unknown) {
      console.error(`❌ FAILED: ${tc.name}`);
      console.error(err);
      failed++;
    }
  }

  const duration = Date.now() - startTime;
  console.log('\n============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | DURATION: ${duration}ms`);
  console.log('============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
