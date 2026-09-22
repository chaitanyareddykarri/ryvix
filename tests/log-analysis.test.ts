/**
 * Master Test Suite: Deep Server Log Analysis & Root Cause Diagnostic Engine
 * 
 * Verifies:
 * 1. Structured Multi-Format Log Parsing (journalctl, syslog, auth.log, nginx, postgresql, redis).
 * 2. Automatic Extraction of Log Levels, Daemons, PIDs, and Offending IP addresses.
 * 3. Deep Root Cause Classification across 12 Critical Operational Scenarios:
 *    - Linux Kernel OOM Killer Invocation
 *    - Block Device Storage Sector I/O Error
 *    - Userland Binary Segmentation Fault (SIGSEGV)
 *    - PostgreSQL Deadlock Cycle Detection
 *    - PostgreSQL Slow Query Bottleneck
 *    - Redis RDB Snapshot Persistence Failure
 *    - Nginx 502 Upstream Connection Refused
 *    - SSL/TLS Certificate Expired Handshake Failure
 *    - V8 JavaScript Engine Heap Out of Memory
 *    - Docker Container Exit Code 137 (OOMKilled)
 *    - Unauthorized Sudo Root Escalation Attempt
 *    - Repeated SSH Authentication Brute-Force
 * 4. Deterministic Shell Remediation & Whitelisted Capability Payloads.
 */

import assert from 'node:assert/strict';
import {
  LogAnalysisEngine,
  ParsedLogEntry,
  LogAnalysisReport,
} from '../ai/src/orchestrator';

export async function testLogAnalysisEngine(): Promise<void> {
  console.log('[TEST] Running Deep Server Log Analysis & Root Cause Diagnostic Test...');

  // =========================================================================
  // 1. TEST STRUCTURED PARSING (LEVEL, SERVICE, PID, CLIENT IP)
  // =========================================================================
  console.log('  -> 1. Testing Structured Log Tokenizer & Metadata Extraction...');
  
  const rawLine1 = 'Sep 22 00:15:02 web-ingress-01 sshd[18492]: Failed password for invalid user admin from 198.51.100.77 port 48291 ssh2';
  const entry1 = LogAnalysisEngine.parseLine(rawLine1);
  assert.equal(entry1.level, 'ERROR');
  assert.equal(entry1.service, 'sshd');
  assert.equal(entry1.pid, 18492);
  assert.equal(entry1.clientIp, '198.51.100.77');
  console.log(`  ✓ Line 1 parsed: Service=${entry1.service} | PID=${entry1.pid} | Level=${entry1.level} | IP=${entry1.clientIp}`);

  const rawLine2 = 'nginx: 2026/09/22 00:16:11 [crit] 481#481: *1941 SSL_do_handshake() failed: certificate has expired';
  const entry2 = LogAnalysisEngine.parseLine(rawLine2);
  assert.equal(entry2.level, 'CRITICAL');
  assert.equal(entry2.service, 'nginx');
  console.log(`  ✓ Line 2 parsed: Service=${entry2.service} | Level=${entry2.level}`);

  // =========================================================================
  // 2. TEST 12 CRITICAL LOG ROOT CAUSE DIAGNOSES
  // =========================================================================
  console.log('  -> 2. Testing 12 Deep Infrastructure Root Cause Diagnoses...');

  // Scenario 1: Linux Kernel OOM Killer
  const oomLogs = [
    'kernel: [19482.112] Out of memory: Kill process 3841 (node) score 852 or sacrifice child',
    'kernel: [19482.113] Killed process 3841 (node) total-vm:4289120kB, anon-rss:2941000kB',
  ];
  const oomRep = LogAnalysisEngine.analyze(oomLogs, { hostname: 'app-prod-01' });
  assert.equal(oomRep.rootCause, 'OUT_OF_MEMORY_KILLER');
  assert.equal(oomRep.affectedService, 'node');
  assert.equal(oomRep.severity, 'critical');
  assert.ok(oomRep.remediationCommand.includes('systemctl restart node'));
  console.log('  ✓ 1. Kernel OOM Killer diagnosed.');

  // Scenario 2: Block Device Sector I/O Error
  const ioLogs = [
    'kernel: [29104.22] blk_update_request: I/O error, dev sda, sector 489210 op 0x0:(READ)',
    'kernel: [29104.23] Buffer I/O error on dev sda1, logical block 12048, async page read',
  ];
  const ioRep = LogAnalysisEngine.analyze(ioLogs, { hostname: 'db-host-01' });
  assert.equal(ioRep.rootCause, 'BLOCK_DEVICE_IO_ERROR');
  assert.equal(ioRep.severity, 'critical');
  assert.ok(ioRep.remediationCommand.includes('remount,ro'));
  console.log('  ✓ 2. Block Device Storage I/O Error diagnosed.');

  // Scenario 3: Binary Segmentation Fault (SIGSEGV)
  const segfaultLogs = [
    'kernel: [4012.91] python3[8491]: segfault at 0 ip 00007f8b91048291 sp 00007ffe81920 error 4 in libc.so.6',
  ];
  const segRep = LogAnalysisEngine.analyze(segfaultLogs, { hostname: 'worker-node-02' });
  assert.equal(segRep.rootCause, 'SEGMENTATION_FAULT');
  assert.equal(segRep.affectedService, 'python3');
  assert.ok(segRep.remediationCommand.includes('coredumpctl'));
  console.log('  ✓ 3. Segmentation Fault (SIGSEGV) diagnosed.');

  // Scenario 4: PostgreSQL Deadlock
  const deadlockLogs = [
    'ERROR: deadlock detected',
    'DETAIL: Process 2910 waits for ExclusiveLock on relation 18492 of database 16384; blocked by process 2914.',
    'Process 2914 waits for ExclusiveLock on relation 18488 of database 16384; blocked by process 2910.',
  ];
  const deadlockRep = LogAnalysisEngine.analyze(deadlockLogs, { hostname: 'postgres-primary-01' });
  assert.equal(deadlockRep.rootCause, 'DATABASE_DEADLOCK');
  assert.equal(deadlockRep.affectedService, 'postgresql');
  assert.equal(deadlockRep.capabilityToInvoke.action, 'database.kill_idle_connections');
  console.log('  ✓ 4. PostgreSQL Deadlock Cycle diagnosed.');

  // Scenario 5: PostgreSQL Slow Query
  const slowQueryLogs = [
    'LOG: duration: 18492.118 ms statement: SELECT * FROM orders JOIN order_items ON orders.id = order_items.order_id WHERE customer_id = 94821',
  ];
  const slowRep = LogAnalysisEngine.analyze(slowQueryLogs, { hostname: 'postgres-primary-01' });
  assert.equal(slowRep.rootCause, 'DATABASE_SLOW_QUERY');
  assert.ok(slowRep.remediationCommand.includes('pg_stat_statements'));
  console.log('  ✓ 5. PostgreSQL Slow Query Bottleneck diagnosed.');

  // Scenario 6: Redis RDB Snapshot Failure
  const redisLogs = [
    'MISCONF Redis is configured to save RDB snapshots, but is currently not able to persist on disk. Commands that may modify the data set are disabled.',
  ];
  const redisRep = LogAnalysisEngine.analyze(redisLogs, { hostname: 'redis-cache-01' });
  assert.equal(redisRep.rootCause, 'REDIS_SNAPSHOT_FAILURE');
  assert.equal(redisRep.affectedService, 'redis');
  assert.ok(redisRep.remediationCommand.includes('vm.overcommit_memory=1'));
  console.log('  ✓ 6. Redis RDB Snapshot Failure diagnosed.');

  // Scenario 7: Nginx 502 Upstream Refused
  const nginxLogs = [
    '2026/09/22 00:18:02 [error] 491#491: *8192 connect() failed (111: Connection refused) while connecting to upstream, client: 203.0.113.52, server: api.ryvix.io',
  ];
  const nginxRep = LogAnalysisEngine.analyze(nginxLogs, { hostname: 'edge-proxy-01' });
  assert.equal(nginxRep.rootCause, 'UPSTREAM_CONNECTION_REFUSED');
  assert.equal(nginxRep.affectedService, 'nginx');
  assert.ok(nginxRep.remediationCommand.includes('systemctl restart app-backend'));
  console.log('  ✓ 7. Nginx Upstream 502 Connection Refused diagnosed.');

  // Scenario 8: SSL/TLS Certificate Expired
  const sslLogs = [
    '2026/09/22 00:19:00 [crit] 491#491: *9912 SSL_do_handshake() failed: certificate has expired while SSL handshaking',
  ];
  const sslRep = LogAnalysisEngine.analyze(sslLogs, { hostname: 'edge-proxy-01' });
  assert.equal(sslRep.rootCause, 'SSL_HANDSHAKE_FAILURE');
  assert.equal(sslRep.capabilityToInvoke.action, 'security.renew_ssl_cert');
  console.log('  ✓ 8. SSL/TLS Certificate Expiration diagnosed.');

  // Scenario 9: Node.js V8 Heap Out Of Memory
  const nodeOomLogs = [
    '<--- Last few GCs --->',
    'FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory',
  ];
  const nodeOomRep = LogAnalysisEngine.analyze(nodeOomLogs, { hostname: 'app-worker-03' });
  assert.equal(nodeOomRep.rootCause, 'JAVASCRIPT_HEAP_EXHAUSTION');
  assert.ok(nodeOomRep.remediationCommand.includes('--max-old-space-size=4096'));
  console.log('  ✓ 9. Node.js V8 JavaScript Heap OOM diagnosed.');

  // Scenario 10: Docker Container Exit Code 137
  const dockerLogs = [
    'dockerd[1482]: container c8f921d7b1a died with exit status 137 (OOMKilled)',
  ];
  const dockerRep = LogAnalysisEngine.analyze(dockerLogs, { hostname: 'k8s-worker-01' });
  assert.equal(dockerRep.rootCause, 'CONTAINER_OOM_EXIT');
  assert.equal(dockerRep.capabilityToInvoke.action, 'container.restart_with_bump');
  console.log('  ✓ 10. Docker Container Exit Code 137 (OOMKilled) diagnosed.');

  // Scenario 11: Unauthorized Sudo Root Escalation
  const sudoLogs = [
    'sudo: user deploy : user NOT in sudoers ; TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/cat /etc/shadow',
  ];
  const sudoRep = LogAnalysisEngine.analyze(sudoLogs, { hostname: 'bastion-01' });
  assert.equal(sudoRep.rootCause, 'UNAUTHORIZED_SUDO_ESCALATION');
  assert.equal(sudoRep.capabilityToInvoke.action, 'security.lock_session');
  console.log('  ✓ 11. Unauthorized Sudo Escalation diagnosed.');

  // Scenario 12: SSH Authentication Failure / Brute Force
  const sshLogs = [
    'pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=203.0.113.99 user=root',
  ];
  const sshRep = LogAnalysisEngine.analyze(sshLogs, { hostname: 'bastion-01' });
  assert.equal(sshRep.rootCause, 'SSH_AUTH_ANOMALY');
  assert.equal(sshRep.extractedIp, '203.0.113.99');
  assert.equal(sshRep.capabilityToInvoke.action, 'firewall.block_ip');
  console.log('  ✓ 12. SSH PAM Authentication Failure diagnosed (IP: 203.0.113.99).');

  console.log('✓ Deep Server Log Analysis & Root Cause Diagnostic Test ALL PASSED!\n');
}

if (require.main === module) {
  testLogAnalysisEngine().catch((err) => {
    console.error('Log Analysis Test Failed:', err);
    process.exit(1);
  });
}
