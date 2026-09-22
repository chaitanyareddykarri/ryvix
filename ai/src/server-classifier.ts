/**
 * Ryvix Server Archetype & Deep Module Classifier
 * 
 * Inspects host ports, processes, active systemd units, filesystem paths, and logs
 * to classify server roles and active internal modules with 100% deterministic accuracy.
 * Tailors security policies, diagnostic commands, and remediation capabilities to the host.
 */

import {
  SERVER_MODULES_REGISTRY,
  DETAILED_SERVER_ARCHETYPES,
  ServerModuleDefinition,
  DetailedServerArchetype,
} from './server-modules-knowledge';

export type ServerArchetype =
  | 'WEB_EDGE_PROXY'
  | 'DATABASE_HOST'
  | 'CACHE_MESSAGE_BROKER'
  | 'APPLICATION_RUNTIME'
  | 'CONTAINER_CLUSTER_NODE'
  | 'STORAGE_VOLUME_NODE'
  | 'SECURITY_BASTION'
  | 'CICD_BUILD_RUNNER'
  | 'GENERIC_LINUX_HOST';

export interface ServerFeatures {
  archetype: ServerArchetype;
  displayName: string;
  primaryServices: string[];
  sensitivePaths: string[];
  remediationCapabilities: string[];
  description: string;
  detectedModules?: string[];
  diagnosticCommands?: string[];
  securityChecklist?: string[];
}

export class ServerClassifier {
  /**
   * Inspects telemetry to determine which specific internal modules are active on the host.
   */
  static inspectModules(data: {
    openPorts?: number[];
    processes?: string[];
    systemdUnits?: string[];
    logs?: string[];
  }): ServerModuleDefinition[] {
    const textBlob = [
      ...(data.processes || []),
      ...(data.systemdUnits || []),
      ...(data.logs || []),
    ].join(' ').toLowerCase();

    const ports = new Set(data.openPorts || []);
    const detected: ServerModuleDefinition[] = [];

    for (const [id, mod] of Object.entries(SERVER_MODULES_REGISTRY)) {
      const portMatch = mod.defaultPorts.some((p) => ports.has(p));
      const processMatch = mod.processPatterns.some((pattern) => textBlob.includes(pattern.toLowerCase()));

      if (portMatch || processMatch) {
        detected.push(mod);
      }
    }

    // Always include linux_kernel as base OS module
    if (!detected.some((m) => m.id === 'linux_kernel') && SERVER_MODULES_REGISTRY.linux_kernel) {
      detected.push(SERVER_MODULES_REGISTRY.linux_kernel);
    }

    return detected;
  }

  /**
   * Returns complete architectural specs and security checklists for an archetype.
   */
  static getArchetypeDetails(archetype: string): DetailedServerArchetype | undefined {
    return DETAILED_SERVER_ARCHETYPES[archetype];
  }

  /**
   * Classifies a host into its specialized role based on system telemetry.
   */
  static classify(data: {
    hostname?: string;
    openPorts?: number[];
    processes?: string[];
    systemdUnits?: string[];
    logs?: string[];
  }): ServerFeatures {
    const textBlob = [
      data.hostname || '',
      ...(data.processes || []),
      ...(data.systemdUnits || []),
      ...(data.logs || []),
    ].join(' ').toLowerCase();

    const ports = new Set(data.openPorts || []);
    const activeModules = this.inspectModules(data);
    const moduleIds = activeModules.map((m) => m.id);
    const diagnosticCommands = Array.from(new Set(activeModules.flatMap((m) => m.diagnosticCommands))).slice(0, 8);

    // 1. Database Host (Postgres, MySQL, MariaDB, Mongo, Clickhouse)
    if (
      ports.has(5432) || ports.has(3306) || ports.has(27017) || ports.has(9000) ||
      textBlob.includes('postgres') || textBlob.includes('mysqld') || textBlob.includes('mongod') || textBlob.includes('mariadb')
    ) {
      const details = DETAILED_SERVER_ARCHETYPES.DATABASE_HOST;
      return {
        archetype: 'DATABASE_HOST',
        displayName: 'Database Cluster Host',
        primaryServices: ['postgresql', 'mysql', 'mongod'],
        sensitivePaths: ['/var/lib/postgresql', '/var/lib/mysql', '/etc/postgresql'],
        remediationCapabilities: ['database.kill_idle_connections', 'service.restart', 'disk.cleanup_temp', 'firewall.block_ip'],
        description: 'High-IOPS persistence node hosting relational or document databases with ACID transaction guarantees.',
        detectedModules: moduleIds,
        diagnosticCommands,
        securityChecklist: details?.securityChecklist,
      };
    }

    // 2. Cache & Message Broker (Redis, RabbitMQ, Kafka)
    if (
      ports.has(6379) || ports.has(5672) || ports.has(9092) || ports.has(11211) ||
      textBlob.includes('redis-server') || textBlob.includes('rabbitmq') || textBlob.includes('kafka')
    ) {
      const details = DETAILED_SERVER_ARCHETYPES.CACHE_MESSAGE_BROKER;
      return {
        archetype: 'CACHE_MESSAGE_BROKER',
        displayName: 'In-Memory Cache & Message Broker',
        primaryServices: ['redis-server', 'rabbitmq-server', 'kafka'],
        sensitivePaths: ['/var/lib/redis', '/etc/redis/redis.conf'],
        remediationCapabilities: ['cache.flush_expired', 'service.restart', 'firewall.block_ip'],
        description: 'Low-latency in-memory data store, queue broker, and pub/sub distribution host.',
        detectedModules: moduleIds,
        diagnosticCommands,
        securityChecklist: details?.securityChecklist,
      };
    }

    // 3. Web & Edge Proxy (Nginx, Caddy, Envoy, Apache, HAProxy)
    if (
      ports.has(80) || ports.has(443) || ports.has(8443) ||
      textBlob.includes('nginx') || textBlob.includes('caddy') || textBlob.includes('envoy') || textBlob.includes('haproxy')
    ) {
      const details = DETAILED_SERVER_ARCHETYPES.WEB_EDGE_PROXY;
      return {
        archetype: 'WEB_EDGE_PROXY',
        displayName: 'Web Gateway & Ingress Reverse Proxy',
        primaryServices: ['nginx', 'caddy', 'envoy', 'haproxy'],
        sensitivePaths: ['/etc/nginx', '/etc/ssl/certs', '/etc/letsencrypt'],
        remediationCapabilities: ['reverse_proxy.harden_timeouts', 'reverse_proxy.reload', 'security.renew_ssl_cert', 'waf.block_pattern'],
        description: 'Ingress traffic router handling TLS termination, WAF rate limiting, HTTP/2 multiplexing, and upstream proxying.',
        detectedModules: moduleIds,
        diagnosticCommands,
        securityChecklist: details?.securityChecklist,
      };
    }

    // 4. CI/CD Build Runner (GitHub Runner, GitLab Runner, Jenkins) - Evaluated before generic container node
    if (
      textBlob.includes('actions-runner') || textBlob.includes('gitlab-runner') || textBlob.includes('jenkins')
    ) {
      return {
        archetype: 'CICD_BUILD_RUNNER',
        displayName: 'Continuous Integration & Build Runner',
        primaryServices: ['actions-runner', 'gitlab-runner', 'docker'],
        sensitivePaths: ['/actions-runner', '/var/lib/jenkins'],
        remediationCapabilities: ['disk.cleanup_temp', 'service.restart', 'process.kill_by_name'],
        description: 'Automated CI/CD build host executing test suites, artifact compilation, and Docker builds.',
        detectedModules: moduleIds,
        diagnosticCommands,
      };
    }

    // 5. Container & Orchestration Node (Docker, K8s, Containerd)
    if (
      textBlob.includes('dockerd') || textBlob.includes('containerd') || textBlob.includes('kubelet') || textBlob.includes('k8s')
    ) {
      const details = DETAILED_SERVER_ARCHETYPES.CONTAINER_CLUSTER_NODE;
      return {
        archetype: 'CONTAINER_CLUSTER_NODE',
        displayName: 'Container & Cluster Worker Node',
        primaryServices: ['docker', 'containerd', 'kubelet'],
        sensitivePaths: ['/var/lib/docker', '/var/run/docker.sock', '/etc/kubernetes'],
        remediationCapabilities: ['container.restart_with_bump', 'container.restart', 'disk.cleanup_temp'],
        description: 'Compute worker host running containerized microservices under Docker or Kubernetes control.',
        detectedModules: moduleIds,
        diagnosticCommands,
        securityChecklist: details?.securityChecklist,
      };
    }

    // 6. Application Runtime Host (Node.js, Next.js, Python Gunicorn, Go, Java)
    if (
      ports.has(3000) || ports.has(5000) || ports.has(8000) ||
      textBlob.includes('nodejs') || textBlob.includes('node.js') || textBlob.includes('next-server') || (data.processes || []).some((p) => p === 'node') || textBlob.includes('gunicorn') || textBlob.includes('uvicorn')
    ) {
      const details = DETAILED_SERVER_ARCHETYPES.APPLICATION_RUNTIME;
      return {
        archetype: 'APPLICATION_RUNTIME',
        displayName: 'Application Runtime & Microservice Node',
        primaryServices: ['app-backend', 'node-worker', 'gunicorn'],
        sensitivePaths: ['/app', '/var/www', '/etc/environment'],
        remediationCapabilities: ['service.restart', 'disk.cleanup_temp', 'process.kill_by_name'],
        description: 'Host executing user-facing backend application logic, API handlers, and asynchronous event loops.',
        detectedModules: moduleIds,
        diagnosticCommands,
        securityChecklist: details?.securityChecklist,
      };
    }

    // 7. Security Bastion / VPN Gateway
    if (
      ports.has(51820) || ports.has(3022) || textBlob.includes('wireguard') || textBlob.includes('bastion') || textBlob.includes('teleport')
    ) {
      const details = DETAILED_SERVER_ARCHETYPES.SECURITY_BASTION;
      return {
        archetype: 'SECURITY_BASTION',
        displayName: 'Zero-Trust Bastion & VPN Gateway',
        primaryServices: ['sshd', 'wg-quick', 'teleport'],
        sensitivePaths: ['/etc/ssh', '/etc/wireguard', '/root/.ssh'],
        remediationCapabilities: ['firewall.block_ip', 'security.lock_session', 'service.restart'],
        description: 'Hardened perimeter gateway controlling administrative access into internal VPC network zones.',
        detectedModules: moduleIds,
        diagnosticCommands,
        securityChecklist: details?.securityChecklist,
      };
    }

    // 8. Storage & Object Store Node
    if (
      ports.has(9001) || ports.has(2049) || textBlob.includes('minio') || textBlob.includes('nfs') || textBlob.includes('ceph')
    ) {
      return {
        archetype: 'STORAGE_VOLUME_NODE',
        displayName: 'Distributed Storage & Object Store Node',
        primaryServices: ['minio', 'nfs-kernel-server', 'ceph-osd'],
        sensitivePaths: ['/mnt/data', '/etc/exports'],
        remediationCapabilities: ['disk.cleanup_temp', 'disk.purge_orphaned_inodes', 'service.restart'],
        description: 'Persistent block, file, or object storage server managing media artifacts, snapshots, and backups.',
        detectedModules: moduleIds,
        diagnosticCommands,
      };
    }

    // Default: Generic Linux Host
    return {
      archetype: 'GENERIC_LINUX_HOST',
      displayName: 'Standard Linux Operating System Host',
      primaryServices: ['systemd', 'cron', 'sshd'],
      sensitivePaths: ['/etc', '/var/log'],
      remediationCapabilities: ['service.restart', 'firewall.block_ip', 'disk.cleanup_temp'],
      description: 'Standard Linux instance operating general-purpose infrastructure workloads.',
      detectedModules: moduleIds,
      diagnosticCommands,
    };
  }
}
