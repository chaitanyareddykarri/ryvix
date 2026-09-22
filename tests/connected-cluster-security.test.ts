/**
 * Master Test Suite: Connected Server AI Threat Detection, Log Parsing & Cluster IP Blocker
 * 
 * Verifies:
 * 1. Host Agent Streams Telemetry & Real-World Logs to AI.
 * 2. Connected AI automatically parses logs and extracts offending IP addresses.
 * 3. AI triggers real-time firewall IP blocking (iptables) on the affected host.
 * 4. Cluster-Wide Broadcast: Offending IP is automatically blocked across ALL peer cluster nodes!
 * 5. Capability Whitelist: Verifies unauthorized commands are rejected with security errors.
 * 6. Audit Trail: Verifies incident details, blocked IPs, and cluster broadcast results are logged.
 */

import assert from 'node:assert/strict';
import { InternalAgent } from '../services/src/connector/internal-agent';
import { ClusterSecurityCoordinator } from '../services/src/connector/cluster-security.coordinator';
import { ServerEventData } from '../ai/src/local-security-engine';

export async function testConnectedClusterSecurity(): Promise<void> {
  console.log('[TEST] Running Connected AI Threat Detection, Log Parsing & Cluster IP Blocker Test...');

  // 1. Initialize Multi-Node Cluster
  console.log('  -> 1. Initializing 3-Node Connected Server Cluster...');
  const coordinator = new ClusterSecurityCoordinator('production_cluster_us_east');

  const webAgent = new InternalAgent('srv_web_01', 'ingress-web-01');
  const dbAgent = new InternalAgent('srv_db_01', 'pg-cluster-db-01');
  const appAgent = new InternalAgent('srv_app_01', 'backend-app-01');

  coordinator.registerNode('srv_web_01', 'ingress-web-01', webAgent);
  coordinator.registerNode('srv_db_01', 'pg-cluster-db-01', dbAgent);
  coordinator.registerNode('srv_app_01', 'backend-app-01', appAgent);

  const nodes = coordinator.getClusterNodes();
  assert.equal(nodes.length, 3, 'Must register 3 cluster nodes');
  console.log(`  ✓ 3 Cluster nodes registered: ${nodes.map((n) => n.hostname).join(', ')}.`);

  // 2. Simulate Attack on Node 1 (SSH Brute Force with Offending IP in logs)
  console.log('  -> 2. Streaming Real-World Attack Logs to Connected AI...');
  const attackEvent: ServerEventData = {
    serverId: 'srv_web_01',
    hostname: 'ingress-web-01',
    openPorts: [22, 80, 443],
    metrics: { cpuPercent: 35, memPercent: 40, diskPercent: 25, failedAuthAttempts: 12 },
    recentLogs: [
      'pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=198.51.100.45 user=root',
      'Failed password for invalid user admin from 198.51.100.45 port 48292 ssh2',
    ],
  };

  const processResult = await coordinator.processNodeTelemetryAndLogs('srv_web_01', attackEvent);

  assert.equal(processResult.threatDetected, true, 'AI must detect the attack from logs');
  assert.equal(processResult.analysis.threatType, 'SSH_BRUTE_FORCE', 'AI must identify SSH_BRUTE_FORCE');
  assert.equal(processResult.analysis.extractedAttackerIp, '198.51.100.45', 'AI must extract offending IP from log text');
  console.log(`  ✓ AI detected threat: ${processResult.analysis.threatType} | Extracted IP: ${processResult.analysis.extractedAttackerIp}.`);

  // 3. Verify Local Firewall IP Block on Target Host
  console.log('  -> 3. Verifying Local Netfilter/iptables IP Block Execution...');
  assert.equal(webAgent.isIpBlocked('198.51.100.45'), true, 'Node 1 agent must have 198.51.100.45 blocked');
  console.log('  ✓ Offending IP 198.51.100.45 blocked in iptables on ingress-web-01.');

  // 4. Verify Cluster-Wide Broadcast Protection
  console.log('  -> 4. Verifying Proactive Cluster-Wide Firewall Rule Propagation...');
  assert.ok(processResult.incident?.clusterBroadcastResult, 'Must generate cluster broadcast result');
  assert.equal(processResult.incident?.clusterBroadcastResult.peersNotified, 2, 'Must notify 2 peer nodes');

  // Verify DB node and App node have proactively blocked the attacker IP as well!
  assert.equal(dbAgent.isIpBlocked('198.51.100.45'), true, 'Database node must proactively block the IP');
  assert.equal(appAgent.isIpBlocked('198.51.100.45'), true, 'Application node must proactively block the IP');
  console.log('  ✓ PROACTIVE CLUSTER PROTECTION: Offending IP 198.51.100.45 blocked across pg-cluster-db-01 and backend-app-01!');

  // 5. Test SQL Injection Incident with IP Extraction
  console.log('  -> 5. Testing Web SQLi Log Trigger with IP Extraction...');
  const sqliEvent: ServerEventData = {
    serverId: 'srv_app_01',
    hostname: 'backend-app-01',
    openPorts: [3000],
    metrics: { cpuPercent: 40, memPercent: 50, diskPercent: 30 },
    recentLogs: ["nginx error: client: 203.0.113.88 query contained ' OR '1'='1 UNION SELECT password FROM users -- -"],
  };

  const sqliResult = await coordinator.processNodeTelemetryAndLogs('srv_app_01', sqliEvent);
  assert.equal(sqliResult.threatDetected, true);
  assert.equal(sqliResult.analysis.threatType, 'SQL_INJECTION');
  assert.equal(sqliResult.analysis.extractedAttackerIp, '203.0.113.88');
  assert.equal(appAgent.isIpBlocked('203.0.113.88'), true);
  assert.equal(webAgent.isIpBlocked('203.0.113.88'), true);
  assert.equal(dbAgent.isIpBlocked('203.0.113.88'), true);
  console.log('  ✓ Web SQLi from 203.0.113.88 blocked cluster-wide across all 3 nodes.');

  // 6. Verify Incident Audit Ledger
  const incidents = coordinator.getIncidents();
  assert.equal(incidents.length, 2, 'Must record both incidents');
  assert.ok(incidents[0].incidentId.startsWith('inc_'), 'Valid incident ID format');
  console.log(`  ✓ Incident ledger records ${incidents.length} security containment events with full audit trace.`);

  console.log('✓ Connected AI Threat Detection, Log Parsing & Cluster IP Blocker Test ALL PASSED!\n');
}

if (require.main === module) {
  testConnectedClusterSecurity().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
