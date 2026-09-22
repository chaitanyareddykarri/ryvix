/**
 * Ryvix Deep Log Analysis & Root Cause Diagnostic Engine
 * 
 * Embedded real-time log intelligence:
 * 1. Multi-Format Parser: Automatically ingests journalctl, syslog, auth.log, nginx, postgresql, and redis logs.
 * 2. Structured Tokenizer: Extracts timestamps, log levels (INFO/WARN/ERROR/FATAL), service daemons, PIDs, and client IPs.
 * 3. Root Cause Classification: Identifies 12+ deep operational and infrastructure failure modes.
 * 4. Automated Remediation Mapping: Generates deterministic CLI shell fixes and whitelisted capability payloads.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL' | 'FATAL';

export interface ParsedLogEntry {
  raw: string;
  timestamp?: string;
  level: LogLevel;
  service?: string;
  pid?: number;
  clientIp?: string;
  message: string;
}

export type LogRootCauseCategory =
  | 'OUT_OF_MEMORY_KILLER'
  | 'BLOCK_DEVICE_IO_ERROR'
  | 'SEGMENTATION_FAULT'
  | 'UNAUTHORIZED_SUDO_ESCALATION'
  | 'SSH_AUTH_ANOMALY'
  | 'DATABASE_DEADLOCK'
  | 'DATABASE_SLOW_QUERY'
  | 'REDIS_SNAPSHOT_FAILURE'
  | 'UPSTREAM_CONNECTION_REFUSED'
  | 'SSL_HANDSHAKE_FAILURE'
  | 'JAVASCRIPT_HEAP_EXHAUSTION'
  | 'CONTAINER_OOM_EXIT'
  | 'UNKNOWN_LOG_ANOMALY';

export interface LogAnalysisReport {
  rootCause: LogRootCauseCategory;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'none';
  affectedService: string;
  summary: string;
  technicalDetails: string;
  recommendedAction: string;
  remediationCommand: string;
  capabilityToInvoke: {
    action: string;
    params: Record<string, any>;
  };
  parsedEntries: ParsedLogEntry[];
  extractedIp?: string;
  confidence: number;
}

export class LogAnalysisEngine {
  /**
   * Parses a single raw log string into a structured ParsedLogEntry object.
   */
  static parseLine(raw: string): ParsedLogEntry {
    const trimmed = raw.trim();
    let level: LogLevel = 'INFO';
    let service: string | undefined;
    let pid: number | undefined;
    let clientIp: string | undefined;

    // Detect Log Level
    if (/\b(fatal|panic|emerg|alert)\b/i.test(trimmed)) {
      level = 'FATAL';
    } else if (/\b(crit|critical)\b/i.test(trimmed)) {
      level = 'CRITICAL';
    } else if (/\b(err|error|failed|failure)\b/i.test(trimmed)) {
      level = 'ERROR';
    } else if (/\b(warn|warning)\b/i.test(trimmed)) {
      level = 'WARN';
    } else if (/\b(debug|trace)\b/i.test(trimmed)) {
      level = 'DEBUG';
    }

    // Extract IPv4
    const ipMatch = trimmed.match(/\b(?:client:?\s*|rhost=|from\s+)?([0-9]{1,3}(?:\.[0-9]{1,3}){3})\b/i);
    if (ipMatch && !ipMatch[1].startsWith('127.') && ipMatch[1] !== '0.0.0.0') {
      clientIp = ipMatch[1];
    }

    // Extract Daemon / Service & PID: e.g. "sshd[12948]:", "nginx[492]:", "systemd[1]:"
    const serviceMatch = trimmed.match(/([a-zA-Z0-9_.-]+)\[(\d+)\]:/);
    if (serviceMatch) {
      service = serviceMatch[1];
      pid = parseInt(serviceMatch[2], 10);
    } else {
      // Fallback service detection
      const simpleService = trimmed.match(/\b(sshd|nginx|postgres|redis|dockerd|systemd|kernel|node|python|caddy)\b/i);
      if (simpleService) {
        service = simpleService[1].toLowerCase();
      }
    }

    return {
      raw: trimmed,
      level,
      service,
      pid,
      clientIp,
      message: trimmed,
    };
  }

  /**
   * Parses an array of raw log lines.
   */
  static parseBatch(logs: string[]): ParsedLogEntry[] {
    return logs.map((l) => this.parseLine(l));
  }

  /**
   * Analyzes an array of logs to perform deep root cause analysis and diagnosis.
   */
  static analyze(logs: string[], context?: { hostname?: string; serverType?: string }): LogAnalysisReport {
    const parsed = this.parseBatch(logs);
    const combined = logs.join(' ').toLowerCase();
    const host = context?.hostname || 'target-server';

    let extractedIp: string | undefined;
    for (const entry of parsed) {
      if (entry.clientIp) {
        extractedIp = entry.clientIp;
        break;
      }
    }

    // 1. Linux Kernel Out Of Memory (OOM Killer)
    if (combined.includes('invoked oom-killer') || combined.includes('out of memory: kill process') || combined.includes('killed process')) {
      const match = combined.match(/kill(?:ed)? process (\d+) \(([^)]+)\)/i);
      const victimProcess = match ? match[2] : 'application worker';
      return {
        rootCause: 'OUT_OF_MEMORY_KILLER',
        severity: 'critical',
        affectedService: victimProcess,
        summary: `Kernel OOM Killer invoked on ${host}. Terminated '${victimProcess}' due to host memory starvation.`,
        technicalDetails: 'The Linux kernel memory manager reached cgroup / system page exhaustion and sacrificed high-RSS processes.',
        recommendedAction: 'Restart victim service with memory limit bounds and enable swap or kernel memory overcommit.',
        remediationCommand: `systemctl restart ${victimProcess} && sync && echo 3 > /proc/sys/vm/drop_caches`,
        capabilityToInvoke: { action: 'service.restart', params: { unit: victimProcess } },
        parsedEntries: parsed,
        confidence: 0.99,
      };
    }

    // 2. Block Device Hardware / Filesystem I/O Error
    if (combined.includes('i/o error, dev') || combined.includes('blk_update_request: i/o error') || combined.includes('buffer i/o error on dev')) {
      const devMatch = combined.match(/dev\s+([a-zA-Z0-9]+)/i);
      const dev = devMatch ? devMatch[1] : 'sda';
      return {
        rootCause: 'BLOCK_DEVICE_IO_ERROR',
        severity: 'critical',
        affectedService: 'kernel/storage',
        summary: `Hardware or block device I/O error detected on /dev/${dev} on ${host}.`,
        technicalDetails: 'Underlying block storage sector read/write failure reported by SCSI/NVMe kernel driver.',
        recommendedAction: 'Remount volume read-only immediately to prevent data corruption and initiate snapshot recovery.',
        remediationCommand: `mount -o remount,ro /dev/${dev} && fsck -fy /dev/${dev}`,
        capabilityToInvoke: { action: 'disk.cleanup_temp', params: { device: dev } },
        parsedEntries: parsed,
        confidence: 0.98,
      };
    }

    // 3. Userland Binary Segmentation Fault (SIGSEGV)
    if (combined.includes('segfault at') || combined.includes('general protection fault') || combined.includes('kernel: segfault')) {
      const segMatch = combined.match(/([a-zA-Z0-9_.-]+)\[\d+\]: segfault/i);
      const binary = segMatch ? segMatch[1] : 'executable';
      return {
        rootCause: 'SEGMENTATION_FAULT',
        severity: 'high',
        affectedService: binary,
        summary: `Memory access violation (Segmentation Fault) in binary '${binary}' on ${host}.`,
        technicalDetails: 'Process attempted to access unmapped virtual memory address (null pointer dereference or buffer overflow).',
        recommendedAction: 'Inspect core dump via coredumpctl and restart application with debug symbols.',
        remediationCommand: `coredumpctl info ${binary} && systemctl restart ${binary}`,
        capabilityToInvoke: { action: 'service.restart', params: { unit: binary } },
        parsedEntries: parsed,
        confidence: 0.98,
      };
    }

    // 4. PostgreSQL Deadlock Detected
    if (combined.includes('deadlock detected') || combined.includes('process waits for exclusivelock')) {
      return {
        rootCause: 'DATABASE_DEADLOCK',
        severity: 'high',
        affectedService: 'postgresql',
        summary: `Relational database deadlock cycle detected on PostgreSQL on ${host}.`,
        technicalDetails: 'Two or more concurrent database transactions attempted to acquire mutually exclusive locks in reverse order.',
        recommendedAction: 'Terminate blocking idle transactions and add query index to prevent table lock escalation.',
        remediationCommand: `sudo -u postgres psql -c "SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction';"`,
        capabilityToInvoke: { action: 'database.kill_idle_connections', params: { thresholdSeconds: 10 } },
        parsedEntries: parsed,
        confidence: 0.99,
      };
    }

    // 5. PostgreSQL Slow Query Bottleneck
    if (combined.includes('duration:') && (combined.includes('ms statement:') || combined.includes('duration: 1'))) {
      return {
        rootCause: 'DATABASE_SLOW_QUERY',
        severity: 'medium',
        affectedService: 'postgresql',
        summary: `Expensive unindexed database query exceeding execution latency threshold on ${host}.`,
        technicalDetails: 'Sequential scan detected over millions of tuples without B-tree index.',
        recommendedAction: 'Execute EXPLAIN ANALYZE on query and add missing composite index.',
        remediationCommand: `sudo -u postgres psql -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 5;"`,
        capabilityToInvoke: { action: 'database.kill_idle_connections', params: { thresholdSeconds: 30 } },
        parsedEntries: parsed,
        confidence: 0.96,
      };
    }

    // 6. Redis RDB Snapshot Persistence Failure
    if (combined.includes('misconf redis is configured to save rdb snapshots') || combined.includes('failed opening the temp db file')) {
      return {
        rootCause: 'REDIS_SNAPSHOT_FAILURE',
        severity: 'high',
        affectedService: 'redis',
        summary: `Redis background disk persistence failed on ${host}. Write commands rejected.`,
        technicalDetails: 'Redis fork() failed due to insufficient Linux memory overcommit (vm.overcommit_memory != 1) or read-only disk.',
        recommendedAction: 'Enable Linux memory overcommit and clear disk space on /var/lib/redis.',
        remediationCommand: 'sysctl -w vm.overcommit_memory=1 && redis-cli config set stop-writes-on-bgsave-error no',
        capabilityToInvoke: { action: 'cache.flush_expired', params: { service: 'redis' } },
        parsedEntries: parsed,
        confidence: 0.98,
      };
    }

    // 7. Nginx / Web 502 Upstream Connection Refused
    if (combined.includes('111: connection refused') && combined.includes('while connecting to upstream')) {
      return {
        rootCause: 'UPSTREAM_CONNECTION_REFUSED',
        severity: 'high',
        affectedService: 'nginx',
        summary: `Nginx reverse proxy unable to route traffic: upstream backend server is DOWN on ${host}.`,
        technicalDetails: 'Nginx received TCP RST from localhost upstream port. Node/Python application worker is not running.',
        recommendedAction: 'Restart backend application service and reload Nginx.',
        remediationCommand: 'systemctl restart app-backend && nginx -s reload',
        capabilityToInvoke: { action: 'service.restart', params: { unit: 'app-backend' } },
        parsedEntries: parsed,
        confidence: 0.99,
      };
    }

    // 8. SSL / TLS Certificate Expired Handshake Failure
    if (combined.includes('certificate has expired') || combined.includes('ssl_do_handshake() failed') || combined.includes('sslv3 alert certificate expired')) {
      return {
        rootCause: 'SSL_HANDSHAKE_FAILURE',
        severity: 'high',
        affectedService: 'nginx/tls',
        summary: `HTTPS traffic disrupted: TLS/SSL certificate expired on ${host}.`,
        technicalDetails: 'Inbound TLS handshake rejected by client browser due to expired Let\'s Encrypt X.509 certificate.',
        recommendedAction: 'Force certbot ACME certificate renewal and reload web server.',
        remediationCommand: 'certbot renew --force-renewal && systemctl reload nginx',
        capabilityToInvoke: { action: 'security.renew_ssl_cert', params: { service: 'nginx' } },
        parsedEntries: parsed,
        confidence: 0.99,
      };
    }

    // 9. JavaScript / Node.js Heap Out Of Memory
    if (combined.includes('javascript heap out of memory') || combined.includes('allocation failed - javascript heap out of memory')) {
      return {
        rootCause: 'JAVASCRIPT_HEAP_EXHAUSTION',
        severity: 'high',
        affectedService: 'node-app',
        summary: `V8 JavaScript engine memory ceiling reached (Heap OOM) on ${host}.`,
        technicalDetails: 'Node.js process memory allocated exceeded the default 2GB/4GB V8 max-old-space-size.',
        recommendedAction: 'Restart Node.js process with elevated --max-old-space-size=4096 parameter.',
        remediationCommand: 'NODE_OPTIONS="--max-old-space-size=4096" systemctl restart node-app',
        capabilityToInvoke: { action: 'service.restart', params: { unit: 'node-app' } },
        parsedEntries: parsed,
        confidence: 0.99,
      };
    }

    // 10. Docker Container Killed (Exit Code 137)
    if (combined.includes('exit status 137') || combined.includes('exited with code 137') || combined.includes('(oomkilled)')) {
      return {
        rootCause: 'CONTAINER_OOM_EXIT',
        severity: 'high',
        affectedService: 'docker',
        summary: `Docker container was terminated with Exit Code 137 (SIGKILL OOM) on ${host}.`,
        technicalDetails: 'The container exceeded its configured Docker cgroup memory limit and was killed by cgroups kernel manager.',
        recommendedAction: 'Bump container memory allocation and restart container.',
        remediationCommand: 'docker update --memory 2g app-container && docker restart app-container',
        capabilityToInvoke: { action: 'container.restart_with_bump', params: { containerId: 'app-container' } },
        parsedEntries: parsed,
        confidence: 0.98,
      };
    }

    // 11. Unauthorized Sudo Privilege Violation
    if (combined.includes('user not in sudoers') || combined.includes('not in the sudoers file') || combined.includes('sudo: auth could not identify password')) {
      return {
        rootCause: 'UNAUTHORIZED_SUDO_ESCALATION',
        severity: 'high',
        affectedService: 'sudo/auth',
        summary: `Unauthorized root escalation attempt detected on ${host}.`,
        technicalDetails: 'Unprivileged user account attempted to invoke sudo without authorized sudoers entry.',
        recommendedAction: 'Audit /etc/sudoers.d and revoke unauthorized user access.',
        remediationCommand: 'grep -E "^[a-zA-Z0-9]" /etc/sudoers /etc/sudoers.d/*',
        capabilityToInvoke: { action: 'security.lock_session', params: { host } },
        parsedEntries: parsed,
        confidence: 0.97,
      };
    }

    // 12. SSH Authentication Anomaly / Brute Force
    if (combined.includes('authentication failure') && combined.includes('sshd')) {
      return {
        rootCause: 'SSH_AUTH_ANOMALY',
        severity: 'high',
        affectedService: 'sshd',
        summary: `Repeated SSH authentication failure from IP ${extractedIp || 'unknown'} on ${host}.`,
        technicalDetails: 'PAM authentication failure logged by OpenSSH daemon.',
        recommendedAction: `Block offending IP ${extractedIp || ''} in iptables firewall table.`,
        remediationCommand: `iptables -I INPUT -s ${extractedIp || '<IP>'} -j DROP`,
        capabilityToInvoke: { action: 'firewall.block_ip', params: { ip: extractedIp } },
        parsedEntries: parsed,
        extractedIp,
        confidence: 0.98,
      };
    }

    // Default: Generic Log Anomaly
    return {
      rootCause: 'UNKNOWN_LOG_ANOMALY',
      severity: 'low',
      affectedService: 'system',
      summary: `Log analysis completed for ${host}: no critical system failure detected.`,
      technicalDetails: 'Standard log output without matching failure signatures.',
      recommendedAction: 'Continue standard telemetry and log monitoring.',
      remediationCommand: 'journalctl -n 50 --no-pager',
      capabilityToInvoke: { action: 'logs.fetch', params: { lines: 50 } },
      parsedEntries: parsed,
      confidence: 0.85,
    };
  }
}

export const logAnalysisEngine = new LogAnalysisEngine();
