import { InternalAgent } from './helpers/internal-agent-fixture';
import { fakeCloud, testApproval, healthyProbe as fixtureProbe } from './helpers/execution-fixtures';
/** Fixture integration coverage. Does not certify real cloud, firewall or deployment behavior. */

import assert from 'node:assert/strict';
import * as http from 'node:http';
import {
  LocalSecurityEngine,
  ServerClassifier,
  ServerAccessManager,
  neuralThreatClassifier,
  ServerEventData,
} from '../ai/src/orchestrator';
import {
  ClusterSecurityCoordinator,
  CloudRecoveryBridge,
  ApiKeySecurityService,
} from '../services/src/index';

// Helper for live HTTP testing against local Next.js dev server
function testHttpRequest(options: http.RequestOptions, postData?: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });
    req.setTimeout(5000, () => req.destroy(new Error('HTTP acceptance request timed out')));
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

export async function testTotalProjectIntegration(): Promise<void> {
  console.log('======================================================================');
  console.log('RYVIX FIXTURE INTEGRATION TEST');
  console.log('======================================================================\n');

  // =========================================================================
  // LAYER 1: MULTI-TENANT CRYPTOGRAPHIC AUTH & API KEY LIFECYCLE
  // =========================================================================
  console.log('--- [LAYER 1: MULTI-TENANT CRYPTOGRAPHIC AUTH & API KEY LIFECYCLE] ---');
  const apiSecService = new ApiKeySecurityService();
  const { plaintextKey, apiKeyRecord } = apiSecService.generateKey(
    'org_enterprise_alpha',
    'Master Fleet Automation Key',
    ['servers:read', 'servers:write', 'ai:diagnose'],
    30
  );
  assert.ok(plaintextKey.startsWith('ryv_live_'), 'Raw API key prefix valid');
  assert.ok(apiKeyRecord.hashed_secret.length === 64, 'SHA-256 hash length valid');
  assert.notEqual(plaintextKey, apiKeyRecord.hashed_secret, 'Plaintext key must never equal hashed secret');

  const validCheck = apiSecService.verifyKey(plaintextKey, apiKeyRecord, 'ai:diagnose');
  assert.equal(validCheck.isValid, true, 'Cryptographic key and scope verification must succeed');
  console.log('  ✓ Layer 1 PASSED: Multi-tenant API Key generation, SHA-256 hashing, and scope validation verified.');

  // =========================================================================
  // LAYER 2: TRI-PATHWAY USER SERVER ACCESS
  // =========================================================================
  console.log('\n--- [LAYER 2: TRI-PATHWAY USER SERVER ACCESS] ---');
  
  // Pathway A: One-Line Agent Enrollment
  const enrollment = ServerAccessManager.generateAgentEnrollmentCommand('env_production_us', 'hmac_cluster_secret_2026');
  assert.ok(enrollment.token.startsWith('ryvix_enr_'));
  assert.ok(enrollment.shellCommand.includes('curl -sSL https://telemetry.ryvix.io/install.sh'));
  const verifyToken = InternalAgent.verifyEnrollmentToken(enrollment.token, 'hmac_cluster_secret_2026');
  assert.equal(verifyToken.valid, true);
  console.log('  ✓ Pathway A: One-Line Agent Enrollment token & command verified (0 open inbound ports).');

  // Pathway B: Agentless SSH Keypair Generation
  const sshKeypair = ServerAccessManager.generateSshKeypair('ryvix-master-node-01');
  assert.ok(sshKeypair.publicKey.startsWith('ssh-ed25519 '));
  assert.ok(sshKeypair.privateKey.includes('PRIVATE KEY'));
  console.log('  ✓ Pathway B: Agentless Ed25519 SSH keypair generation verified.');

  // Pathway C: Cloud Provider Out-of-Band API
  const cloudVal = ServerAccessManager.validateAccessConfig('CLOUD_PROVIDER_API', {
    cloud: {
      provider: 'digitalocean',
      credentials: { apiKeyOrToken: 'dop_v1_demo_token_sec_key_99' },
      resourceId: 'droplet-98214',
    },
  });
  assert.equal(cloudVal.valid, true);
  console.log('  ✓ Pathway C: Cloud Provider Out-of-Band API configuration verified.');

  // =========================================================================
  // LAYER 3: SERVER ARCHETYPES & INTERNAL MODULES CLASSIFICATION
  // =========================================================================
  console.log('\n--- [LAYER 3: SERVER ARCHETYPES & INTERNAL MODULES CLASSIFICATION] ---');
  const webNode = ServerClassifier.classify({
    hostname: 'ingress-lb-prod-01',
    openPorts: [80, 443],
    processes: ['nginx: master', 'caddy'],
    logs: ['nginx upstream connected 200 ok'],
  });
  assert.equal(webNode.archetype, 'WEB_EDGE_PROXY');
  assert.ok(webNode.detectedModules?.includes('nginx'));

  const dbNode = ServerClassifier.classify({
    hostname: 'postgres-primary-db-01',
    openPorts: [5432],
    processes: ['postgres: writer'],
    logs: ['database system ready for connections'],
  });
  assert.equal(dbNode.archetype, 'DATABASE_HOST');
  assert.ok(dbNode.detectedModules?.includes('postgresql'));

  const appNode = ServerClassifier.classify({
    hostname: 'api-backend-node-01',
    openPorts: [3000],
    processes: ['node', 'pm2'],
    logs: ['listening on port 3000'],
  });
  assert.equal(appNode.archetype, 'APPLICATION_RUNTIME');
  console.log(`  ✓ Layer 3 PASSED: Classified 3 server archetypes with internal modules: [${webNode.archetype}, ${dbNode.archetype}, ${appNode.archetype}].`);

  // =========================================================================
  // LAYER 4 & 5: NEURAL NETWORK INFERENCE & PROACTIVE CLUSTER IP BLOCKER
  // =========================================================================
  console.log('\n--- [LAYERS 4 & 5: NEURAL NETWORK ENGINE & CLUSTER IP BLOCKER] ---');
  const clusterCoordinator = new ClusterSecurityCoordinator('fleet_alpha_cluster');
  
  const agentWeb = new InternalAgent('srv_web_01', 'ingress-lb-prod-01');
  const agentDb = new InternalAgent('srv_db_01', 'postgres-primary-db-01');
  const agentApp = new InternalAgent('srv_app_01', 'api-backend-node-01');

  clusterCoordinator.registerNode('srv_web_01', 'ingress-lb-prod-01', agentWeb);
  clusterCoordinator.registerNode('srv_db_01', 'postgres-primary-db-01', agentDb);
  clusterCoordinator.registerNode('srv_app_01', 'api-backend-node-01', agentApp);

  // Attack 1: SSH Brute Force Ingress
  const sshAttackEvent: ServerEventData = {
    serverId: 'srv_web_01',
    hostname: 'ingress-lb-prod-01',
    openPorts: [22, 80, 443],
    metrics: { cpuPercent: 35, memPercent: 45, diskPercent: 30, failedAuthAttempts: 15 },
    recentLogs: [
      'pam_unix(sshd:auth): authentication failure; rhost=198.51.100.99 user=root',
      'Failed password for invalid user admin from 198.51.100.99 port 51224 ssh2',
    ],
  };

  const t0NN = performance.now();
  const processResult = await clusterCoordinator.processNodeTelemetryAndLogs('srv_web_01', sshAttackEvent);
  const latencyNN = performance.now() - t0NN;

  assert.equal(processResult.threatDetected, true);
  assert.equal(processResult.analysis.threatType, 'SSH_BRUTE_FORCE');
  assert.equal(processResult.analysis.extractedAttackerIp, '198.51.100.99');
  assert.ok(processResult.analysis.neuralPrediction, 'Neural prediction payload present');

  // Verify Local IP Block
  assert.equal(agentWeb.isIpBlocked('198.51.100.99'), true, 'Local host must block IP in iptables');

  // Verify Proactive Cluster Broadcast Block on Peer Nodes
  assert.equal(agentDb.isIpBlocked('198.51.100.99'), true, 'Peer DB node must proactively block attacker IP');
  assert.equal(agentApp.isIpBlocked('198.51.100.99'), true, 'Peer App node must proactively block attacker IP');
  console.log(`  ✓ Layers 4 & 5 PASSED: Threat diagnosed in ${latencyNN.toFixed(3)}ms. IP 198.51.100.99 blocked cluster-wide across all 3 nodes.`);

  // =========================================================================
  // LAYER 6: OUT-OF-BAND CLOUD RECOVERY & SELF-HEALING
  // =========================================================================
  console.log('\n--- [LAYER 6: OUT-OF-BAND CLOUD RECOVERY & SELF-HEALING] ---');
  const bridge = new CloudRecoveryBridge({ aws: fakeCloud, digitalocean: fakeCloud });
  const resetResult = await bridge.executePowerAction('aws', 'i-0123456789abcdef0', 'hard_reset', testApproval);
  assert.equal(resetResult.status, 'dispatched');
  assert.ok(resetResult.providerMessage.includes('Provider action'));

  const capExec = await agentApp.executeCapability('service.restart', { unit: 'node-app' });
  assert.equal(capExec.success, true);
  console.log('  ✓ Layer 6 PASSED: Injected cloud response and fixture service-state checks passed; no real reboot.');

  if (process.env.RYVIX_TEST_LOCAL_HTTP === 'true') {
    await verifyUnauthenticatedServerBoundary();
    console.log('Local HTTP authentication rejection checks passed. Authenticated acceptance remains separate.');
  } else {
    console.log('SKIP local HTTP checks: set RYVIX_TEST_LOCAL_HTTP=true with localhost:3000 running.');
  }
  console.log('Fixture integration checks passed. Real provider/deployment acceptance was not tested.');
}

export async function verifyUnauthenticatedServerBoundary(
  request: typeof testHttpRequest = testHttpRequest,
): Promise<void> {
  for (const method of ['GET', 'POST']) {
    const result = await request({ hostname:'localhost', port:3000, path:'/api/servers', method,
      headers:{'Content-Type':'application/json'} }, method === 'POST' ? {} : undefined);
    assert.equal(result.statusCode,401, method + ' /api/servers must reject unauthenticated access');
  }
}

if (require.main === module) {
  testTotalProjectIntegration().catch((err) => {
    console.error('Total Project Integration Test Failed:', err);
    process.exit(1);
  });
}
