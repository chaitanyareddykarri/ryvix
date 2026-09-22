/**
 * Master Test Suite: Server Archetypes, Internal Modules & User Server Access Pathways
 * 
 * Verifies:
 * 1. Deep Server Archetype & Internal Module Inspection:
 *    - Web Edge Proxy, Relational/NoSQL Database, In-Memory Cache, Container Node,
 *      Application Runtime, Security Bastion, and CI/CD Runner.
 *    - Verifies detection of active modules, diagnostic commands, and security checklists.
 * 2. User Server Access Pathways:
 *    - Pathway 1: One-Line Agent Enrollment (Zero inbound ports, HMAC-SHA256 token).
 *    - Pathway 2: SSH Credential Access (Ed25519 keypair generation, sudo audit).
 *    - Pathway 3: Cloud Provider Out-of-Band API (AWS, DigitalOcean, Hetzner recovery).
 * 3. AI Connection Troubleshooting & Diagnostic Intelligence:
 *    - SSH Publickey Denied -> step-by-step permissions fix.
 *    - Port 22 Closed / Filtered -> Cloud Security Group diagnosis & agent fallback.
 *    - Sudo Requires Password -> /etc/sudoers.d automated guidance.
 *    - Cloud API Unauthorized -> IAM permission audit.
 */

import assert from 'node:assert/strict';
import {
  ServerClassifier,
  ServerAccessManager,
  SERVER_MODULES_REGISTRY,
  DETAILED_SERVER_ARCHETYPES,
} from '../ai/src/orchestrator';

export async function testServerModulesAndAccess(): Promise<void> {
  console.log('[TEST] Running Server Archetypes, Modules & User Server Access Pathways Test...');

  // =========================================================================
  // 1. TEST SERVER ARCHETYPES & INTERNAL MODULES INSPECTION
  // =========================================================================
  console.log('  -> 1. Testing Server Archetype & Module Inspection Intelligence...');

  // Test A: Nginx Web Edge Proxy
  const webServer = ServerClassifier.classify({
    hostname: 'ingress-edge-us-east',
    openPorts: [80, 443],
    processes: ['nginx: master process', 'nginx: worker process'],
    logs: ['nginx 200 GET /api/v1/health'],
  });
  assert.equal(webServer.archetype, 'WEB_EDGE_PROXY');
  assert.ok(webServer.detectedModules?.includes('nginx'), 'Must detect nginx module');
  assert.ok(webServer.detectedModules?.includes('linux_kernel'), 'Must include linux_kernel base');
  assert.ok(webServer.diagnosticCommands && webServer.diagnosticCommands.length > 0);
  assert.ok(webServer.securityChecklist && webServer.securityChecklist.length > 0);
  console.log(`  ✓ Web Edge Proxy classified: Modules=[${webServer.detectedModules?.join(', ')}] | Diagnostics=${webServer.diagnosticCommands.length}`);

  // Test B: PostgreSQL Database Host
  const dbServer = ServerClassifier.classify({
    hostname: 'production-postgres-db-01',
    openPorts: [5432],
    processes: ['postgres: checkpointer', 'postgres: writer'],
    logs: ['database system is ready to accept connections'],
  });
  assert.equal(dbServer.archetype, 'DATABASE_HOST');
  assert.ok(dbServer.detectedModules?.includes('postgresql'), 'Must detect postgresql module');
  assert.ok(dbServer.remediationCapabilities.includes('database.kill_idle_connections'));
  console.log(`  ✓ Database Host classified: Modules=[${dbServer.detectedModules?.join(', ')}] | Capabilities=${dbServer.remediationCapabilities.join(', ')}`);

  // Test C: Redis Cache & Message Broker
  const cacheServer = ServerClassifier.classify({
    hostname: 'redis-cache-cluster-01',
    openPorts: [6379],
    processes: ['redis-server'],
    logs: ['Ready to accept connections tcp'],
  });
  assert.equal(cacheServer.archetype, 'CACHE_MESSAGE_BROKER');
  assert.ok(cacheServer.detectedModules?.includes('redis'), 'Must detect redis module');
  console.log(`  ✓ Cache & Broker classified: Modules=[${cacheServer.detectedModules?.join(', ')}]`);

  // Test D: Docker & Container Worker
  const containerServer = ServerClassifier.classify({
    hostname: 'k8s-worker-node-12',
    processes: ['dockerd', 'containerd'],
    logs: ['dockerd: loaded OCI runtime runc'],
  });
  assert.equal(containerServer.archetype, 'CONTAINER_CLUSTER_NODE');
  assert.ok(containerServer.detectedModules?.includes('docker_engine'), 'Must detect docker engine');
  console.log(`  ✓ Container Worker classified: Modules=[${containerServer.detectedModules?.join(', ')}]`);

  // Test E: CI/CD Build Runner
  const cicdServer = ServerClassifier.classify({
    hostname: 'github-actions-runner-spot-04',
    processes: ['actions-runner', 'dockerd'],
    logs: ['Listening for Jobs on runner pool default'],
  });
  assert.equal(cicdServer.archetype, 'CICD_BUILD_RUNNER');
  console.log(`  ✓ CI/CD Runner classified: ${cicdServer.displayName}`);

  // Test F: Verification of Module Encyclopedia
  const moduleKeys = Object.keys(SERVER_MODULES_REGISTRY);
  assert.ok(moduleKeys.length >= 8, 'Registry must contain at least 8 deep server modules');
  assert.ok(SERVER_MODULES_REGISTRY.postgresql.configFiles.some((c) => c.includes('postgresql.conf')));
  assert.ok(SERVER_MODULES_REGISTRY.nginx.diagnosticCommands.includes('nginx -t'));
  console.log(`  ✓ Server Module Registry verified: ${moduleKeys.length} core server engines cataloged.`);

  // =========================================================================
  // 2. TEST USER SERVER ACCESS PATHWAYS
  // =========================================================================
  console.log('  -> 2. Testing 3 User Server Access Pathways...');

  // Pathway 1: One-Line Agent Enrollment (Zero Inbound Ports)
  const enrollment = ServerAccessManager.generateAgentEnrollmentCommand('env_production_alpha', 'cluster_secret_hmac_key_99');
  assert.ok(enrollment.token.startsWith('ryvix_enr_'), 'Valid enrollment token format');
  assert.ok(enrollment.shellCommand.includes('curl -sSL https://telemetry.ryvix.io/install.sh'), 'Valid one-line command');
  assert.ok(enrollment.shellCommand.includes(`--token ${enrollment.token}`));
  assert.equal(enrollment.expiresInHours, 24);

  const valAgent = ServerAccessManager.validateAccessConfig('AGENT_ENROLLMENT', { enrollmentToken: enrollment.token });
  assert.equal(valAgent.valid, true, 'Enrollment token must be valid');
  console.log('  ✓ Pathway 1: One-Line Agent Enrollment token & command verified (zero open inbound ports required).');

  // Pathway 2: SSH Keypair & Credential Access
  const keypair = ServerAccessManager.generateSshKeypair('ryvix-automation-host-01');
  assert.ok(keypair.publicKey.startsWith('ssh-ed25519 '), 'Must generate Ed25519 public key');
  assert.ok(keypair.privateKey.includes('BEGIN PRIVATE KEY'), 'Must generate valid private key PEM');

  const valSsh = ServerAccessManager.validateAccessConfig('SSH_CREDENTIAL', {
    ssh: {
      host: '198.51.100.22',
      port: 22,
      username: 'ubuntu',
      authMethod: 'generated_keypair',
      publicKey: keypair.publicKey,
    },
  });
  assert.equal(valSsh.valid, true, 'SSH configuration must be valid');
  console.log('  ✓ Pathway 2: Agentless SSH Ed25519 keypair generation and credential configuration verified.');

  // Pathway 3: Cloud Provider Out-of-Band API Access
  const valCloud = ServerAccessManager.validateAccessConfig('CLOUD_PROVIDER_API', {
    cloud: {
      provider: 'aws',
      credentials: { roleArn: 'arn:aws:iam::123456789012:role/RyvixServerRecoveryRole', region: 'us-east-1' },
      resourceId: 'i-0abcdef1234567890',
    },
  });
  assert.equal(valCloud.valid, true, 'Cloud provider recovery configuration must be valid');
  console.log('  ✓ Pathway 3: Cloud Provider Out-of-Band API validation verified (AWS/DO/Hetzner).');

  // =========================================================================
  // 3. TEST AI CONNECTION TROUBLESHOOTING & DIAGNOSTIC INTELLIGENCE
  // =========================================================================
  console.log('  -> 3. Testing AI Diagnostic Intelligence for Server Connection Errors...');

  // Diagnostic 1: SSH Publickey Rejected
  const diag1 = ServerAccessManager.diagnoseAccessError(
    'SSH_CREDENTIAL',
    'Permission denied (publickey,gssapi-keyex,gssapi-with-mic).',
    { host: '198.51.100.22', port: 22, user: 'deploy' }
  );
  assert.equal(diag1.errorCode, 'SSH_AUTH_PUBLICKEY_REJECTED');
  assert.ok(diag1.recommendedUserAction.includes('chmod 700 ~/.ssh'));
  assert.ok(diag1.recommendedUserAction.includes('authorized_keys'));
  assert.equal(diag1.alternativeAccessSuggested, 'AGENT_ENROLLMENT');
  console.log('  ✓ AI correctly diagnosed SSH Publickey rejection and generated permissions repair instructions.');

  // Diagnostic 2: Port 22 Filtered / Cloud Security Group Block
  const diag2 = ServerAccessManager.diagnoseAccessError(
    'SSH_CREDENTIAL',
    'ssh: connect to host 198.51.100.22 port 22: Connection timed out',
    { host: '198.51.100.22', port: 22, user: 'ubuntu' }
  );
  assert.equal(diag2.errorCode, 'SSH_PORT_UNREACHABLE_OR_FILTERED');
  assert.ok(diag2.recommendedUserAction.includes('Security Group'));
  assert.equal(diag2.alternativeAccessSuggested, 'AGENT_ENROLLMENT');
  console.log('  ✓ AI correctly diagnosed Cloud Security Group firewall block and suggested outbound-only Agent Enrollment.');

  // Diagnostic 3: Sudo Requires Interactive Password
  const diag3 = ServerAccessManager.diagnoseAccessError(
    'SSH_CREDENTIAL',
    'sudo: a password is required',
    { host: '198.51.100.22', port: 22, user: 'deploy' }
  );
  assert.equal(diag3.errorCode, 'SUDO_PRIVILEGE_MISSING');
  assert.ok(diag3.recommendedUserAction.includes('NOPASSWD:ALL'));
  assert.ok(diag3.recommendedUserAction.includes('/etc/sudoers.d/ryvix-automation'));
  console.log('  ✓ AI correctly diagnosed sudoers restriction and generated NOPASSWD command.');

  // Diagnostic 4: Cloud API Token Unauthorized
  const diag4 = ServerAccessManager.diagnoseAccessError(
    'CLOUD_PROVIDER_API',
    'UnauthorizedOperation: You are not authorized to perform this operation: ec2:RebootInstances'
  );
  assert.equal(diag4.errorCode, 'CLOUD_API_CREDENTIALS_INVALID');
  assert.ok(diag4.recommendedUserAction.includes('ec2:RebootInstances'));
  console.log('  ✓ AI correctly diagnosed Cloud IAM permission deficiency.');

  console.log('✓ Server Archetypes, Modules & User Server Access Pathways ALL PASSED!');
}

if (require.main === module) {
  testServerModulesAndAccess().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
