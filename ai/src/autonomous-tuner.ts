/**
 * @file autonomous-tuner.ts
 * @module @ryvix/ai
 *
 * Autonomous Linux Kernel & Daemon Performance Tuner
 * Dynamic specification-aware configuration generator tailored to
 * CPU cores, RAM size, storage IOPS, and workload archetypes.
 */

export interface HostHardwareProfile {
  cpuCores: number;
  ramGb: number;
  storageType: 'NVME_SSD' | 'SATA_SSD' | 'HDD';
  archetype: 'WEB_EDGE_PROXY' | 'DATABASE_HOST' | 'CACHE_MESSAGE_BROKER' | 'APPLICATION_RUNTIME';
}

export interface TunedSystemConfigurations {
  sysctlConf: Record<string, string | number>;
  serviceConfName: string;
  serviceConfContent: string;
  rationale: string[];
}

export class AutonomousPerformanceTuner {
  public tuneHost(profile: HostHardwareProfile): TunedSystemConfigurations {
    const sysctl = this.generateKernelSysctl(profile);
    const { confName, content, rationale } = this.generateDaemonConf(profile);

    return {
      sysctlConf: sysctl,
      serviceConfName: confName,
      serviceConfContent: content,
      rationale,
    };
  }

  private generateKernelSysctl(profile: HostHardwareProfile): Record<string, string | number> {
    const config: Record<string, string | number> = {
      'fs.file-max': profile.ramGb >= 16 ? 2097152 : 1048576,
      'net.core.somaxconn': profile.cpuCores >= 8 ? 65535 : 16384,
      'net.ipv4.tcp_max_syn_backlog': profile.cpuCores >= 8 ? 65535 : 16384,
      'net.ipv4.tcp_tw_reuse': 1,
      'net.ipv4.tcp_fin_timeout': 15,
      'vm.swappiness': profile.archetype === 'DATABASE_HOST' ? 10 : 30,
    };

    if (profile.archetype === 'DATABASE_HOST' || profile.archetype === 'CACHE_MESSAGE_BROKER') {
      config['vm.overcommit_memory'] = 1;
      config['vm.dirty_background_ratio'] = 5;
      config['vm.dirty_ratio'] = 10;
    }

    return config;
  }

  private generateDaemonConf(profile: HostHardwareProfile): { confName: string; content: string; rationale: string[] } {
    const rationale: string[] = [];

    if (profile.archetype === 'DATABASE_HOST') {
      const sharedBuffersMb = Math.round(profile.ramGb * 1024 * 0.25); // 25% of RAM
      const effectiveCacheMb = Math.round(profile.ramGb * 1024 * 0.75); // 75% of RAM
      const workMemMb = Math.max(16, Math.round((profile.ramGb * 1024 * 0.1) / (profile.cpuCores * 2)));

      rationale.push(`Allocated 25% of ${profile.ramGb}GB RAM (${sharedBuffersMb}MB) to shared_buffers.`);
      rationale.push(`Set effective_cache_size to 75% RAM (${effectiveCacheMb}MB) for optimal query plan index scans.`);
      rationale.push(`Sized work_mem to ${workMemMb}MB per parallel worker.`);

      const content = [
        '# Autotuned PostgreSQL Configuration by Ryvix Autonomous SRE',
        `shared_buffers = ${sharedBuffersMb}MB`,
        `effective_cache_size = ${effectiveCacheMb}MB`,
        `work_mem = ${workMemMb}MB`,
        `maintenance_work_mem = ${Math.min(2048, Math.round(profile.ramGb * 64))}MB`,
        `max_connections = ${profile.cpuCores * 50}`,
        `max_parallel_workers_per_gather = ${Math.min(4, Math.max(2, Math.floor(profile.cpuCores / 2)))}`,
        'checkpoint_completion_target = 0.9',
        'wal_buffers = 16MB',
      ].join('\n');

      return { confName: 'postgresql.conf', content, rationale };
    }

    if (profile.archetype === 'WEB_EDGE_PROXY') {
      const workerProcesses = profile.cpuCores;
      const workerConnections = profile.ramGb >= 8 ? 16384 : 4096;

      rationale.push(`Scaled Nginx worker_processes to ${workerProcesses} CPU cores.`);
      rationale.push(`Configured ${workerConnections} worker_connections for high concurrency.`);

      const content = [
        '# Autotuned Nginx Configuration by Ryvix Autonomous SRE',
        `worker_processes auto;`,
        `events {`,
        `    worker_connections ${workerConnections};`,
        `    use epoll;`,
        `    multi_accept on;`,
        `}`,
        `http {`,
        `    keepalive_timeout 65;`,
        `    client_max_body_size 50M;`,
        `    gzip on;`,
        `    gzip_comp_level 5;`,
        `    gzip_types text/plain text/css application/json application/javascript;`,
        `}`,
      ].join('\n');

      return { confName: 'nginx.conf', content, rationale };
    }

    if (profile.archetype === 'CACHE_MESSAGE_BROKER') {
      const maxMemMb = Math.round(profile.ramGb * 1024 * 0.8);
      rationale.push(`Reserved 80% RAM (${maxMemMb}MB) for Redis in-memory key-space.`);

      const content = [
        '# Autotuned Redis Configuration by Ryvix Autonomous SRE',
        `maxmemory ${maxMemMb}mb`,
        `maxmemory-policy allkeys-lru`,
        `tcp-backlog 65535`,
        `save "" # Snapshot disabled for pure cache tier`,
      ].join('\n');

      return { confName: 'redis.conf', content, rationale };
    }

    // Default Node/App runtime
    const content = [
      '# Autotuned App Runtime Environment',
      `NODE_OPTIONS="--max-old-space-size=${Math.round(profile.ramGb * 1024 * 0.7)}"`,
      `UV_THREADPOOL_SIZE=${profile.cpuCores * 2}`,
    ].join('\n');

    rationale.push(`Set V8 memory ceiling to 70% of ${profile.ramGb}GB host RAM.`);
    return { confName: 'app.env', content, rationale };
  }
}

export const autonomousPerformanceTuner = new AutonomousPerformanceTuner();
