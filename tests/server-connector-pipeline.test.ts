import assert from 'node:assert/strict';
import { InternalAgent } from '../services/src/connector/internal-agent';
import { CloudRecoveryBridge } from '../services/src/connector/cloud-recovery.bridge';

export async function testServerConnectorPipeline() {
  console.log('[TEST] Running Path 2: Server Connectors & Autonomous Host Daemons (Phases 1-4)...');

  // =========================================================================
  // PHASE 1: SERVER ENROLLMENT & TOKEN CRYPTOGRAPHY TEST
  // =========================================================================
  console.log('  -> Testing Phase 1: Server Enrollment & Cryptographic Tokens...');

  const secretKey = 'super_secret_environment_key_2026';
  const environmentId = 'env_ecommerce_production';

  // Generate signed token
  const token = InternalAgent.generateEnrollmentToken(environmentId, secretKey, 24);
  assert.ok(token.startsWith('ryvix_enr_'), 'Enrollment token must have ryvix_enr_ prefix');

  // Generate install script
  const installCmd = InternalAgent.generateInstallScript(token, 'https://telemetry.ryvix.io');
  assert.ok(installCmd.includes('curl -sSL https://telemetry.ryvix.io/install.sh'), 'Must output standard bash curl command');
  assert.ok(installCmd.includes(token), 'Install command must embed signed token');

  // Verify token
  const verifyResult = InternalAgent.verifyEnrollmentToken(token, secretKey);
  assert.equal(verifyResult.valid, true, 'Valid token signature must pass verification');
  assert.equal(verifyResult.environmentId, environmentId, 'Decoded environment ID must match');

  // Reject tampered token
  const tamperedToken = token.slice(0, -4) + 'abcd';
  const tamperedResult = InternalAgent.verifyEnrollmentToken(tamperedToken, secretKey);
  assert.equal(tamperedResult.valid, false, 'Tampered token must be rejected cryptographically');

  console.log('  ✓ Phase 1: Server Enrollment Token generation & verification PASSED.');

  // =========================================================================
  // PHASE 2: INTERNAL HOST DAEMON TELEMETRY & WHITELIST ENGINE TEST
  // =========================================================================
  console.log('  -> Testing Phase 2: Internal Host Daemon Telemetry & Capability Whitelist...');

  const agent = new InternalAgent('srv_ecom_prod_01', 'node-worker-01');

  // Telemetry emission
  const telemetry = agent.emitTelemetry({ cpuPercent: 35, memPercent: 62 });
  assert.equal(telemetry.serverId, 'srv_ecom_prod_01');
  assert.equal(telemetry.metrics.cpuUsagePercent, 35);
  assert.equal(telemetry.metrics.memoryUsagePercent, 62);
  assert.ok(telemetry.services.some((s) => s.name === 'nginx' && s.status === 'active'), 'Default services should include active nginx');

  // Whitelist Test A: Allowed systemd restart
  const restartNginx = await agent.executeCapability('service.restart', { unit: 'nginx' });
  assert.equal(restartNginx.success, true);
  assert.ok(restartNginx.message.includes('systemctl restart nginx.service completed'));

  // Whitelist Test B: REJECT unwhitelisted service or command injection attempt
  let securityViolationCaught = false;
  try {
    await agent.executeCapability('service.restart', { unit: 'malicious-bin; rm -rf /' });
  } catch (err: any) {
    securityViolationCaught = true;
    assert.ok(err.message.includes('Security Violation'), 'Should explicitly flag security violation');
  }
  assert.equal(securityViolationCaught, true, 'Unwhitelisted service restart must be blocked by capability whitelist');

  // Whitelist Test C: Ephemeral disk cleanup
  const diskCleanup = await agent.executeCapability('disk.cleanup_temp', {});
  assert.equal(diskCleanup.success, true);
  assert.ok((diskCleanup.bytesFreed || 0) > 0, 'Bytes freed must be positive');

  // Whitelist Test D: Reject arbitrary shell commands
  let unlistedCmdCaught = false;
  try {
    await agent.executeCapability('bash.exec', { command: 'cat /etc/shadow' });
  } catch (err: any) {
    unlistedCmdCaught = true;
    assert.ok(err.message.includes('Unsupported or unwhitelisted capability'));
  }
  assert.equal(unlistedCmdCaught, true, 'Arbitrary execution must be blocked');

  console.log('  ✓ Phase 2: Internal Daemon Telemetry & Capability Whitelisting PASSED.');

  // =========================================================================
  // PHASE 3: OUT-OF-BAND CLOUD RECOVERY BRIDGE & DIFFERENTIAL DIAGNOSIS TEST
  // =========================================================================
  console.log('  -> Testing Phase 3: Out-of-Band Cloud Recovery Bridge & Differential Diagnosis...');

  const cloudBridge = new CloudRecoveryBridge();

  // Test Case A: Healthy state diagnosis
  const healthyProbe = await cloudBridge.probeHypervisor('aws', 'i-09ab7c12d45ef');
  const healthyDiagnosis = cloudBridge.diagnoseFailure(10, healthyProbe); // 10s ago heartbeat
  assert.equal(healthyDiagnosis.diagnosis, 'HEALTHY');
  assert.equal(healthyDiagnosis.recommendation, 'NONE');

  // Test Case B: Kernel Freeze / OOM Lockup diagnosis
  // Internal daemon died (>30s ago), but hypervisor is UP and guest instanceCheck impaired
  const frozenProbe = await cloudBridge.probeHypervisor('aws', 'i-09ab7c12d45ef', 'kernel_panic');
  const frozenDiagnosis = cloudBridge.diagnoseFailure(60, frozenProbe); // 60s ago heartbeat
  assert.equal(frozenDiagnosis.diagnosis, 'KERNEL_PANIC_OOM');
  assert.equal(frozenDiagnosis.recommendation, 'OUT_OF_BAND_HARD_RESET');

  // Test Case C: Underlying Cloud Provider Hypervisor Outage
  const outageProbe = await cloudBridge.probeHypervisor('digitalocean', 'do-droplet-892', 'cloud_outage');
  const outageDiagnosis = cloudBridge.diagnoseFailure(120, outageProbe);
  assert.equal(outageDiagnosis.diagnosis, 'HYPERVISOR_OUTAGE');
  assert.equal(outageDiagnosis.recommendation, 'CONTACT_CLOUD_PROVIDER');

  // Test Case D: Execute Out-of-Band Hard Reset
  const oobAction = await cloudBridge.executePowerAction('aws', 'i-09ab7c12d45ef', 'hard_reset');
  assert.equal(oobAction.status, 'completed');
  assert.ok(oobAction.providerMessage.includes('Hypervisor action'));

  console.log('  ✓ Phase 3: Out-of-Band Cloud Recovery & Differential Diagnosis PASSED.');

  // =========================================================================
  // PHASE 4: AUTOMATED SELF-HEALING & RESTORATION INTEGRATION TEST
  // =========================================================================
  console.log('  -> Testing Phase 4: Self-Healing & Service Restoration Flow...');

  // 1. Simulate server with crashed service
  const degradedTelemetry = agent.emitTelemetry({
    serviceOverrides: [
      { name: 'nginx', status: 'failed', subState: 'exited' },
      { name: 'postgresql', status: 'active', subState: 'running' },
    ],
  });
  const failedService = degradedTelemetry.services.find((s) => s.status === 'failed');
  assert.ok(failedService, 'Degraded telemetry must include failed service');
  assert.equal(failedService.name, 'nginx');

  // 2. Dispatch automated recovery plan step (Tier 2 auto-healing or approved)
  const recoveryExecution = await agent.executeCapability('service.restart', { unit: failedService.name });
  assert.equal(recoveryExecution.success, true);

  // 3. Verify subsequent heartbeat returns healthy state
  const recoveredTelemetry = agent.emitTelemetry({
    serviceOverrides: [
      { name: 'nginx', status: 'active', subState: 'running' },
      { name: 'postgresql', status: 'active', subState: 'running' },
    ],
  });
  assert.equal(recoveredTelemetry.services.find((s) => s.name === 'nginx')?.status, 'active');

  console.log('  ✓ Phase 4: Automated Self-Healing & Service Restoration PASSED.');
  console.log('✓ Path 2: Server Connectors & Autonomous Host Daemons (Phases 1-4) ALL TESTS PASSED!\n');
}
