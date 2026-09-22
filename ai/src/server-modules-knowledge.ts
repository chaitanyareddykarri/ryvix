/**
 * Ryvix Deep Server Modules & Infrastructure Knowledge Base
 * 
 * Exhaustive knowledge of:
 * 1. Server Archetypes & Roles (Web Ingress, App Runtimes, Relational/NoSQL Databases,
 *    In-Memory Caches & Message Brokers, Container & Cluster Nodes, Distributed Storage,
 *    Perimeter Security & Bastion Gateways, CI/CD Runners).
 * 2. Internal Server Modules (SSL/TLS Engines, Process Managers, Connection Poolers,
 *    cgroup/OOM Killers, Storage Engines & WAL, Network Sockets, Reverse Proxies).
 * 3. Configuration & Log Paths across Ubuntu, Debian, RHEL/Rocky, and Alpine.
 * 4. Diagnostic Shell Commands & Health Verification Metrics.
 * 5. Automated Failure Modes & Whitelisted Remediations.
 */

export interface ServerModuleDefinition {
  id: string;
  name: string;
  category:
    | 'web_engine'
    | 'runtime_worker'
    | 'database_engine'
    | 'cache_queue'
    | 'container_engine'
    | 'storage_engine'
    | 'security_network'
    | 'kernel_os';
  processPatterns: string[];
  defaultPorts: number[];
  configFiles: string[];
  logFiles: string[];
  diagnosticCommands: string[];
  keyMetrics: string[];
  commonFailures: Array<{
    symptom: string;
    logPattern: string;
    remediationAction: string;
    description: string;
  }>;
}

export interface DetailedServerArchetype {
  archetype: string;
  displayName: string;
  category: string;
  typicalPorts: number[];
  defaultServices: string[];
  sensitivePaths: string[];
  remediationCapabilities: string[];
  modules: string[];
  securityChecklist: string[];
  operationalDescription: string;
}

export const SERVER_MODULES_REGISTRY: Record<string, ServerModuleDefinition> = {
  // 1. Nginx Web & Reverse Proxy Engine
  nginx: {
    id: 'nginx',
    name: 'Nginx High-Performance Ingress & Reverse Proxy',
    category: 'web_engine',
    processPatterns: ['nginx: master', 'nginx: worker'],
    defaultPorts: [80, 443, 8443],
    configFiles: ['/etc/nginx/nginx.conf', '/etc/nginx/conf.d/', '/etc/nginx/sites-available/'],
    logFiles: ['/var/log/nginx/access.log', '/var/log/nginx/error.log'],
    diagnosticCommands: ['nginx -t', 'systemctl status nginx', 'ss -tulpn | grep nginx'],
    keyMetrics: ['active_connections', 'handled_requests', '502_bad_gateway_rate', 'tls_handshake_ms'],
    commonFailures: [
      {
        symptom: '502 Bad Gateway',
        logPattern: 'connect() failed (111: Connection refused) while connecting to upstream',
        remediationAction: 'service.restart',
        description: 'Upstream backend app crashed or socket is unreachable. Restart upstream service.',
      },
      {
        symptom: 'SSL Certificate Expired',
        logPattern: 'certificate has expired or is not yet valid',
        remediationAction: 'security.renew_ssl_cert',
        description: 'Automated Let\'s Encrypt / Certbot ACME renewal triggered to restore HTTPS.',
      },
      {
        symptom: 'Worker Connections Exhausted',
        logPattern: 'worker_connections are not enough while connecting to upstream',
        remediationAction: 'reverse_proxy.harden_timeouts',
        description: 'Increase worker_connections limit and configure keepalive socket reuse.',
      },
    ],
  },

  // 2. Caddy Autonomous Web Server
  caddy: {
    id: 'caddy',
    name: 'Caddy Enterprise Zero-Config TLS Web Server',
    category: 'web_engine',
    processPatterns: ['caddy'],
    defaultPorts: [80, 443, 2019],
    configFiles: ['/etc/caddy/Caddyfile'],
    logFiles: ['/var/log/caddy/access.log'],
    diagnosticCommands: ['caddy validate --config /etc/caddy/Caddyfile', 'systemctl status caddy'],
    keyMetrics: ['http_requests_total', 'tls_active_certificates', 'cpu_percent'],
    commonFailures: [
      {
        symptom: 'ACME Rate Limit / TLS Issuance Failure',
        logPattern: 'too many certificates already issued for exact set of domains',
        remediationAction: 'security.renew_ssl_cert',
        description: 'Fall back to secondary ACME certificate authority (ZeroSSL).',
      },
    ],
  },

  // 3. Node.js / PM2 Process Cluster
  nodejs_pm2: {
    id: 'nodejs_pm2',
    name: 'Node.js V8 Runtime & PM2 Process Supervisor',
    category: 'runtime_worker',
    processPatterns: ['node', 'pm2', 'next-server'],
    defaultPorts: [3000, 3001, 8080],
    configFiles: ['ecosystem.config.js', 'package.json', '/etc/systemd/system/node-app.service'],
    logFiles: ['~/.pm2/logs/', '/var/log/node-app.log', 'journalctl -u node-app'],
    diagnosticCommands: ['pm2 list', 'pm2 monit', 'node -v', 'npm list --depth=0'],
    keyMetrics: ['v8_heap_used_mb', 'v8_heap_total_mb', 'event_loop_lag_ms', 'restart_count'],
    commonFailures: [
      {
        symptom: 'JavaScript Out of Memory',
        logPattern: 'FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory',
        remediationAction: 'service.restart',
        description: 'V8 heap exceeded memory allocation. Restart service with --max-old-space-size=4096.',
      },
      {
        symptom: 'Unhandled Promise Rejection Crash',
        logPattern: 'ERR_UNHANDLED_REJECTION: Uncaught exception in async handler',
        remediationAction: 'service.restart',
        description: 'Process uncaught exception triggered exit. PM2 or systemd auto-restarts.',
      },
    ],
  },

  // 4. Python Gunicorn & Uvicorn ASGI Server
  python_gunicorn: {
    id: 'python_gunicorn',
    name: 'Python Gunicorn / Uvicorn WSGI/ASGI Server',
    category: 'runtime_worker',
    processPatterns: ['gunicorn', 'uvicorn', 'python3'],
    defaultPorts: [8000, 5000],
    configFiles: ['gunicorn.conf.py', '/etc/systemd/system/gunicorn.service'],
    logFiles: ['/var/log/gunicorn/error.log', '/var/log/gunicorn/access.log'],
    diagnosticCommands: ['systemctl status gunicorn', 'journalctl -u gunicorn -n 50'],
    keyMetrics: ['worker_count', 'request_latency_ms', 'active_connections'],
    commonFailures: [
      {
        symptom: 'Worker Timeout',
        logPattern: 'WORKER TIMEOUT (pid:',
        remediationAction: 'service.restart',
        description: 'Synchronous long-running operation blocked worker event loop. Restart and scale workers.',
      },
    ],
  },

  // 5. PostgreSQL Enterprise Database
  postgresql: {
    id: 'postgresql',
    name: 'PostgreSQL Relational ACID Database',
    category: 'database_engine',
    processPatterns: ['postgres: checkpointer', 'postgres: writer', 'postgres: walwriter'],
    defaultPorts: [5432],
    configFiles: ['/etc/postgresql/*/main/postgresql.conf', '/etc/postgresql/*/main/pg_hba.conf'],
    logFiles: ['/var/log/postgresql/postgresql-*-main.log'],
    diagnosticCommands: [
      'sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"',
      'sudo -u postgres psql -c "SELECT * FROM pg_stat_database WHERE datname=current_database();"',
    ],
    keyMetrics: ['active_connections', 'max_connections', 'cache_hit_ratio', 'wal_size_mb', 'dead_tuples'],
    commonFailures: [
      {
        symptom: 'Connection Limit Reached',
        logPattern: 'FATAL: remaining connection slots are reserved for non-replication superuser connections',
        remediationAction: 'database.kill_idle_connections',
        description: 'Client connection pool exhausted. Terminate idle connections and restart connection pooler.',
      },
      {
        symptom: 'Table Bloat / High Dead Tuples',
        logPattern: 'transaction wraparound protection vacuum in progress',
        remediationAction: 'database.kill_idle_connections',
        description: 'Auto-vacuum blocked by long-running transactions. Clear idle transaction locks.',
      },
    ],
  },

  // 6. MySQL & MariaDB
  mysql: {
    id: 'mysql',
    name: 'MySQL / MariaDB Relational Database',
    category: 'database_engine',
    processPatterns: ['mysqld', 'mariadbd'],
    defaultPorts: [3306, 33060],
    configFiles: ['/etc/mysql/my.cnf', '/etc/mysql/mysql.conf.d/mysqld.cnf'],
    logFiles: ['/var/log/mysql/error.log', '/var/log/mysql/slow.log'],
    diagnosticCommands: ['mysqladmin status', 'mysqladmin processlist'],
    keyMetrics: ['threads_connected', 'innodb_buffer_pool_hit_rate', 'slow_queries'],
    commonFailures: [
      {
        symptom: 'Too Many Connections',
        logPattern: 'Error 1040: Too many connections',
        remediationAction: 'database.kill_idle_connections',
        description: 'Terminate hanging client threads and optimize wait_timeout.',
      },
    ],
  },

  // 7. Redis In-Memory Cache & Data Structure Store
  redis: {
    id: 'redis',
    name: 'Redis In-Memory Key-Value Store & Pub/Sub',
    category: 'cache_queue',
    processPatterns: ['redis-server'],
    defaultPorts: [6379, 16379],
    configFiles: ['/etc/redis/redis.conf'],
    logFiles: ['/var/log/redis/redis-server.log'],
    diagnosticCommands: ['redis-cli info memory', 'redis-cli info stats', 'redis-cli ping'],
    keyMetrics: ['used_memory_human', 'maxmemory_human', 'connected_clients', 'instantaneous_ops_per_sec'],
    commonFailures: [
      {
        symptom: 'OOM Command Rejected',
        logPattern: 'OOM command not allowed when used memory > maxmemory',
        remediationAction: 'cache.flush_expired',
        description: 'Redis memory limit hit without eviction. Flush expired keys or increase maxmemory.',
      },
    ],
  },

  // 8. Docker & Containerd Runtime Engine
  docker_engine: {
    id: 'docker_engine',
    name: 'Docker Moby & Containerd Container Engine',
    category: 'container_engine',
    processPatterns: ['dockerd', 'containerd', 'docker-proxy'],
    defaultPorts: [2375, 2376],
    configFiles: ['/etc/docker/daemon.json'],
    logFiles: ['/var/log/docker.log', 'journalctl -u docker'],
    diagnosticCommands: ['docker info', 'docker ps -a', 'docker stats --no-stream', 'df -h /var/lib/docker'],
    keyMetrics: ['containers_running', 'containers_stopped', 'disk_usage_docker_gb', 'oom_killed_containers'],
    commonFailures: [
      {
        symptom: 'Docker Root Partition Full',
        logPattern: 'no space left on device while creating overlay mount',
        remediationAction: 'disk.cleanup_temp',
        description: 'Docker image cache or untagged layers consumed root disk. Prune dangling layers.',
      },
      {
        symptom: 'Container CrashLoopBackOff',
        logPattern: 'container exited with code 137 (OOMKilled)',
        remediationAction: 'container.restart_with_bump',
        description: 'Container exceeded memory ceiling and was killed by cgroups OOM. Restart with higher limit.',
      },
    ],
  },

  // 9. OpenSSH Server & Perimeter Bastion
  openssh: {
    id: 'openssh',
    name: 'OpenSSH Secure Shell Daemon & Bastion',
    category: 'security_network',
    processPatterns: ['sshd'],
    defaultPorts: [22, 2222],
    configFiles: ['/etc/ssh/sshd_config', '/etc/ssh/sshd_config.d/'],
    logFiles: ['/var/log/auth.log', '/var/log/secure'],
    diagnosticCommands: ['sshd -t', 'systemctl status sshd', 'last -n 10', 'fail2ban-client status sshd'],
    keyMetrics: ['failed_logins_per_min', 'active_sessions', 'unique_connecting_ips'],
    commonFailures: [
      {
        symptom: 'SSH Brute-Force Attack',
        logPattern: 'Failed password for invalid user from',
        remediationAction: 'firewall.block_ip',
        description: 'Automated credential stuffing against port 22. Ban IP in Netfilter/iptables.',
      },
    ],
  },

  // 10. Linux Kernel & Systemd Core
  linux_kernel: {
    id: 'linux_kernel',
    name: 'Linux Kernel & Systemd Core Supervisor',
    category: 'kernel_os',
    processPatterns: ['systemd', 'kthreadd'],
    defaultPorts: [],
    configFiles: ['/etc/sysctl.conf', '/etc/security/limits.conf', '/etc/systemd/system.conf'],
    logFiles: ['/var/log/syslog', '/var/log/messages', 'dmesg -T'],
    diagnosticCommands: ['uptime', 'free -h', 'df -h', 'sysctl -a | grep syncookies'],
    keyMetrics: ['load_1m', 'load_5m', 'load_15m', 'ram_available_mb', 'iowait_percent'],
    commonFailures: [
      {
        symptom: 'TCP SYN Flood Exhaustion',
        logPattern: 'possible SYN flooding on port. Sending cookies.',
        remediationAction: 'sysctl.enable_syncookies',
        description: 'Kernel SYN backlog saturated. Enable net.ipv4.tcp_syncookies=1.',
      },
      {
        symptom: 'Host Inode Exhaustion',
        logPattern: 'No space left on device while creating directory',
        remediationAction: 'disk.purge_orphaned_inodes',
        description: 'Disk space remains free but inodes reached 100%. Purge unlinked file descriptors.',
      },
    ],
  },
};

export const DETAILED_SERVER_ARCHETYPES: Record<string, DetailedServerArchetype> = {
  WEB_EDGE_PROXY: {
    archetype: 'WEB_EDGE_PROXY',
    displayName: 'Web Gateway & Ingress Reverse Proxy',
    category: 'Ingress & Traffic Control',
    typicalPorts: [80, 443, 8443],
    defaultServices: ['nginx', 'caddy', 'haproxy', 'certbot'],
    sensitivePaths: ['/etc/nginx', '/etc/ssl/certs', '/etc/letsencrypt', '/var/www'],
    remediationCapabilities: ['reverse_proxy.harden_timeouts', 'security.renew_ssl_cert', 'waf.block_pattern', 'service.restart'],
    modules: ['nginx', 'caddy', 'openssh', 'linux_kernel'],
    securityChecklist: [
      'TLS 1.2/1.3 enforced; SSLv3 and TLS 1.0 disabled',
      'HSTS (Strict-Transport-Security) header configured',
      'Rate-limiting enabled for API and login endpoints',
      'WAF drop rules active for SQLi, XSS, and Path Traversal',
    ],
    operationalDescription: 'Ingress edge server routing public Internet requests to internal VPC microservices.',
  },

  DATABASE_HOST: {
    archetype: 'DATABASE_HOST',
    displayName: 'High-IOPS Persistence & Database Host',
    category: 'Data Persistence',
    typicalPorts: [5432, 3306, 27017, 9000],
    defaultServices: ['postgresql', 'mysql', 'mongod', 'pgbouncer'],
    sensitivePaths: ['/var/lib/postgresql', '/var/lib/mysql', '/etc/postgresql', '/etc/mysql'],
    remediationCapabilities: ['database.kill_idle_connections', 'service.restart', 'disk.cleanup_temp', 'firewall.block_ip'],
    modules: ['postgresql', 'mysql', 'openssh', 'linux_kernel'],
    securityChecklist: [
      'Database ports bind to internal private interface (10.0.0.0/8 or 127.0.0.1); NEVER 0.0.0.0 public',
      'Encrypted connections required (SSL mode require)',
      'Connection pooling configured to prevent resource starvation',
      'Point-in-time WAL replication active',
    ],
    operationalDescription: 'Mission-critical database host executing relational or document transactions with zero data loss.',
  },

  CACHE_MESSAGE_BROKER: {
    archetype: 'CACHE_MESSAGE_BROKER',
    displayName: 'In-Memory Cache & Distributed Message Broker',
    category: 'Async Processing & Caching',
    typicalPorts: [6379, 5672, 9092, 11211],
    defaultServices: ['redis-server', 'rabbitmq-server', 'kafka'],
    sensitivePaths: ['/var/lib/redis', '/etc/redis', '/var/lib/rabbitmq'],
    remediationCapabilities: ['cache.flush_expired', 'service.restart', 'firewall.block_ip'],
    modules: ['redis', 'openssh', 'linux_kernel'],
    securityChecklist: [
      'Requirepass / ACL enabled with strong secret',
      'Dangerous commands renamed or disabled (FLUSHALL, CONFIG, EVAL)',
      'Maxmemory-policy configured (volatile-lru or allkeys-lru)',
    ],
    operationalDescription: 'Microsecond-tier caching layer and pub/sub message backbone.',
  },

  CONTAINER_CLUSTER_NODE: {
    archetype: 'CONTAINER_CLUSTER_NODE',
    displayName: 'Container Runtime & Cluster Compute Node',
    category: 'Compute & Orchestration',
    typicalPorts: [2375, 2376, 10250, 10255],
    defaultServices: ['docker', 'containerd', 'kubelet'],
    sensitivePaths: ['/var/lib/docker', '/var/run/docker.sock', '/etc/kubernetes'],
    remediationCapabilities: ['container.restart_with_bump', 'container.restart', 'disk.cleanup_temp', 'service.restart'],
    modules: ['docker_engine', 'openssh', 'linux_kernel'],
    securityChecklist: [
      'Docker daemon socket restricted to root only (mode 660)',
      'Privileged container execution disallowed',
      'cgroup memory and CPU limits enforced on all container workloads',
    ],
    operationalDescription: 'Compute worker host running scalable containerized services.',
  },

  APPLICATION_RUNTIME: {
    archetype: 'APPLICATION_RUNTIME',
    displayName: 'Application Runtime & Microservice Node',
    category: 'Application Logic',
    typicalPorts: [3000, 5000, 8000, 8080],
    defaultServices: ['node-app', 'gunicorn', 'uvicorn', 'pm2'],
    sensitivePaths: ['/app', '/var/www', '/etc/environment', '~/.pm2'],
    remediationCapabilities: ['service.restart', 'disk.cleanup_temp', 'process.kill_by_name'],
    modules: ['nodejs_pm2', 'python_gunicorn', 'openssh', 'linux_kernel'],
    securityChecklist: [
      'Application runs under unprivileged system user (e.g. node, www-data)',
      'Environment variables stored in protected configuration with 600 permissions',
      'Process auto-restart on unhandled exceptions enabled',
    ],
    operationalDescription: 'Backend host executing core API handlers, business workflows, and event loops.',
  },

  SECURITY_BASTION: {
    archetype: 'SECURITY_BASTION',
    displayName: 'Zero-Trust Perimeter Bastion & VPN Gateway',
    category: 'Perimeter Security',
    typicalPorts: [22, 51820, 3022],
    defaultServices: ['sshd', 'wg-quick', 'fail2ban'],
    sensitivePaths: ['/etc/ssh', '/etc/wireguard', '/root/.ssh'],
    remediationCapabilities: ['firewall.block_ip', 'firewall.tarpit_ip', 'security.lock_session', 'service.restart'],
    modules: ['openssh', 'linux_kernel'],
    securityChecklist: [
      'Password authentication completely disabled (SSH key only)',
      'Root SSH login disabled (PermitRootLogin no)',
      'Strict Netfilter/iptables rules allowing only authorized management subnets',
      'Fail2ban active with automated permanent jail triggers',
    ],
    operationalDescription: 'Heavily hardened entrypoint controlling administrative ingress into private cloud VPCs.',
  },
};
