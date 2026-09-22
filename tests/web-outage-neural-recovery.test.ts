import assert from 'node:assert/strict';
import {
  webOutageRecoveryEngine,
  neuralThreatClassifier,
} from '../ai/src/orchestrator';

export async function testWebOutageNeuralRecovery(): Promise<void> {
  console.log('[TEST] Running Web Outage Diagnostics & Multi-Option Server Recovery Test Suite...');

  // =========================================================================
  // 1. TEST PORT BIND CONFLICT (EADDRINUSE) DIAGNOSIS & RECOVERY
  // =========================================================================
  console.log('  -> 1. Testing Port Bind Conflict (EADDRINUSE) Diagnosis...');
  const portConflictPlan = webOutageRecoveryEngine.diagnoseAndRecover({
    targetUrl: 'http://localhost:3000',
    httpStatusCode: 0,
    port: 3000,
    systemdState: 'failed',
    recentLogs: ['Error: listen EADDRINUSE: address already in use :::3000', 'worker process failed to start'],
  });

  assert.strictEqual(portConflictPlan.rootCause, 'WEB_PORT_BIND_CONFLICT_EADDRINUSE');
  assert.ok(portConflictPlan.primaryActionToStartServer.includes('fuser -k 3000/tcp'));
  assert.ok(portConflictPlan.optionA_ImmediateFix.executableCommand.includes('systemctl restart'));
  assert.ok(portConflictPlan.optionB_StandbyFallback.executableCommand.includes('3001'));
  assert.strictEqual(portConflictPlan.optionC_DisasterRecovery.blastRadius, 'HIGH');
  console.log('  ✓ Port Bind Conflict diagnosed: Auto-generated fuser kill command and port 3001 standby fallback.');

  // =========================================================================
  // 2. TEST MISSING BUILD ARTIFACT DIAGNOSIS (.next / dist missing)
  // =========================================================================
  console.log('  -> 2. Testing Missing Build Artifact Diagnosis...');
  const buildPlan = webOutageRecoveryEngine.diagnoseAndRecover({
    targetUrl: 'http://localhost:3000',
    httpStatusCode: 0,
    port: 3000,
    recentLogs: ['Error: Could not find a production build in the .next directory. Try building your app with "next build"'],
  });

  assert.strictEqual(buildPlan.rootCause, 'WEB_MISSING_BUILD_ARTIFACT');
  assert.ok(buildPlan.primaryActionToStartServer.includes('npm run build'));
  console.log('  ✓ Missing Build Artifact diagnosed: Auto-generated build regeneration and restart sequence.');

  // =========================================================================
  // 3. TEST EXPIRED SSL/TLS CERTIFICATE DIAGNOSIS
  // =========================================================================
  console.log('  -> 3. Testing Expired SSL/TLS Certificate Diagnosis...');
  const sslPlan = webOutageRecoveryEngine.diagnoseAndRecover({
    targetUrl: 'https://example.com',
    httpStatusCode: 0,
    port: 443,
    sslCertDaysRemaining: -2,
    recentLogs: ['SSL_do_handshake() failed: certificate has expired (ERR_SSL_PROTOCOL_ERROR)'],
  });

  assert.strictEqual(sslPlan.rootCause, 'WEB_SSL_CERT_EXPIRED');
  assert.ok(sslPlan.primaryActionToStartServer.includes('certbot renew'));
  console.log('  ✓ Expired SSL diagnosed: Generated Certbot renew and Nginx reload commands.');

  // =========================================================================
  // 4. TEST MISSING ENVIRONMENT VARIABLES / SECRETS
  // =========================================================================
  console.log('  -> 4. Testing Missing Environment Secrets Diagnosis...');
  const envPlan = webOutageRecoveryEngine.diagnoseAndRecover({
    targetUrl: 'http://localhost:3000',
    httpStatusCode: 0,
    port: 3000,
    recentLogs: ['FATAL: missing environment variable DATABASE_URL in process.env'],
  });

  assert.strictEqual(envPlan.rootCause, 'WEB_ENV_CONFIG_MISSING');
  assert.ok(envPlan.primaryActionToStartServer.includes('.env'));
  console.log('  ✓ Missing Env Secrets diagnosed: Generated .env repair directive.');

  // =========================================================================
  // 5. TEST NGINX 502 BAD GATEWAY / HEALTHCHECK FAILURE
  // =========================================================================
  console.log('  -> 5. Testing Nginx 502 Bad Gateway / Healthcheck Failure...');
  const gwPlan = webOutageRecoveryEngine.diagnoseAndRecover({
    targetUrl: 'http://localhost',
    httpStatusCode: 502,
    port: 80,
    isPortListening: true,
    recentLogs: ['connect() failed (111: Connection refused) while connecting to upstream http://127.0.0.1:3000'],
  });

  assert.strictEqual(gwPlan.rootCause, 'WEB_HEALTHCHECK_PROBE_FAILED');
  assert.ok(gwPlan.primaryActionToStartServer.includes('nginx -s reload'));
  console.log('  ✓ Nginx 502 Bad Gateway diagnosed: Formulated backend restart & upstream reload.');

  // =========================================================================
  // 6. TEST 3 DISTINCT PROGRESSIVE RECOVERY OPTIONS (A, B, C)
  // =========================================================================
  console.log('  -> 6. Verifying 3 Progressive Recovery Pathways (Options A, B, C)...');
  assert.strictEqual(portConflictPlan.optionA_ImmediateFix.optionName, 'OPTION_A_IMMEDIATE_FIX');
  assert.strictEqual(portConflictPlan.optionB_StandbyFallback.optionName, 'OPTION_B_STANDBY_FALLBACK');
  assert.strictEqual(portConflictPlan.optionC_DisasterRecovery.optionName, 'OPTION_C_DISASTER_RECOVERY');
  assert.strictEqual(portConflictPlan.optionA_ImmediateFix.blastRadius, 'LOW');
  assert.strictEqual(portConflictPlan.optionC_DisasterRecovery.blastRadius, 'HIGH');
  console.log('  ✓ All 3 recovery options verified: Option A (Immediate Fix), Option B (Standby Bypass), Option C (Cloud Disaster Recovery).');

  // =========================================================================
  // 7. TEST NEURAL NETWORK VECTORIZATION & BACKPROPAGATION
  // =========================================================================
  console.log('  -> 7. Testing Neural Network Web Outage Vectorization & Adam Convergence...');
  const outageVec = neuralThreatClassifier.vectorize({
    openPorts: [],
    logs: ['listen eaddrinuse 3000 port is already allocated'],
    webTelemetry: {
      httpStatusCode: 0,
      isListeningOnPort: false,
      systemdState: 'failed',
    },
  });

  assert.strictEqual(outageVec.length, 64);
  assert.strictEqual(outageVec[7], 1.0, 'Status code 0 mapped to index 7');
  assert.strictEqual(outageVec[8], 0.0, 'Port not listening mapped to index 8');
  assert.strictEqual(outageVec[9], 1.0, 'Failed systemd state mapped to index 9');

  const targetClass = 'WEB_PORT_BIND_CONFLICT_EADDRINUSE';
  const initLoss = neuralThreatClassifier.trainSample(outageVec, targetClass, 0.05);
  let finalLoss = initLoss;
  for (let s = 0; s < 20; s++) {
    finalLoss = neuralThreatClassifier.trainSample(outageVec, targetClass, 0.08);
  }
  assert.ok(finalLoss < initLoss, 'Loss must decrease with Adam optimizer');
  const pred = neuralThreatClassifier.predict(outageVec);
  console.log(`  ✓ Neural learning on web downtime class '${targetClass}': Loss ${initLoss.toFixed(4)} -> ${finalLoss.toFixed(4)} (Prob: ${(pred.classProbabilities[targetClass] * 100).toFixed(1)}%).`);

  console.log('✓ Web Outage Diagnostics & Multi-Option Server Recovery Test Suite ALL PASSED!\n');
}

if (require.main === module) {
  testWebOutageNeuralRecovery().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
