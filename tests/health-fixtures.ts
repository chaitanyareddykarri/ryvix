// Synthetic operational records belong exclusively to test setup.
import { customerHealthStore } from '../services/src/health-query-tools';
export function seedHealthFixtures() {
  const store = customerHealthStore as any;
    const now = Date.now();

    // 1. Healthy Server srv_prod_01 (Org: org_ryvix_demo)
    store.servers.set('srv_prod_01', {
      serverId: 'srv_prod_01',
      hostname: 'app-prod-worker-01',
      organizationId: 'org_ryvix_demo',
      provider: 'AWS (us-east-1)',
      status: 'healthy',
      cpuPercent: 31,
      memoryPercent: 54,
      diskPercent: 61,
      uptimeSeconds: 568800, // 6d 14h
      loadAverage: [0.42, 0.38, 0.31],
      activeSockets: 248,
      services: [
        { name: 'nginx', status: 'active' },
        { name: 'docker', status: 'active' },
        { name: 'postgresql', status: 'active' },
        { name: 'node-app', status: 'active' },
      ],
      containers: [
        { id: 'c1', name: 'web-frontend', status: 'running', memoryUsageMb: 240 },
        { id: 'c2', name: 'api-backend', status: 'running', memoryUsageMb: 380 },
        { id: 'c3', name: 'redis-cache', status: 'running', memoryUsageMb: 110 },
      ],
      openPorts: [80, 443, 3000, 5432],
      connectorStatus: 'active',
      lastTelemetryTimestamp: new Date(now - 8000).toISOString(), // 8 seconds ago
      freshnessAgeSeconds: 8,
      isStale: false,
    });

    // 2. High CPU & Overloaded Server srv_prod_02 (Org: org_ryvix_demo)
    store.servers.set('srv_prod_02', {
      serverId: 'srv_prod_02',
      hostname: 'heavy-compute-worker-02',
      organizationId: 'org_ryvix_demo',
      provider: 'DigitalOcean (nyc3)',
      status: 'degraded',
      cpuPercent: 94,
      memoryPercent: 89,
      diskPercent: 88,
      uptimeSeconds: 86400,
      loadAverage: [4.85, 3.92, 3.10],
      activeSockets: 1420,
      services: [
        { name: 'nginx', status: 'active' },
        { name: 'node-app', status: 'active' },
        { name: 'worker-queue', status: 'active' },
      ],
      containers: [
        { id: 'c4', name: 'batch-processor', status: 'running', memoryUsageMb: 1400 },
      ],
      openPorts: [80, 443, 3000, 8080],
      connectorStatus: 'active',
      lastTelemetryTimestamp: new Date(now - 12000).toISOString(),
      freshnessAgeSeconds: 12,
      isStale: false,
    });

    // 3. Stale Telemetry Server (Telemetry 45 minutes old)
    store.servers.set('srv_prod_stale', {
      serverId: 'srv_prod_stale',
      hostname: 'edge-gateway-stale',
      organizationId: 'org_ryvix_demo',
      provider: 'Hetzner (fsn1)',
      status: 'healthy', // older recorded status
      cpuPercent: 22,
      memoryPercent: 41,
      diskPercent: 30,
      uptimeSeconds: 345600,
      loadAverage: [0.15, 0.18, 0.20],
      activeSockets: 88,
      services: [{ name: 'nginx', status: 'active' }],
      containers: [],
      openPorts: [80, 443],
      connectorStatus: 'degraded',
      lastTelemetryTimestamp: new Date(now - 45 * 60 * 1000).toISOString(), // 45 minutes ago
      freshnessAgeSeconds: 2700,
      isStale: true,
      staleMinutes: 45,
    });

    // 4. Connector Offline BUT External Probe Healthy Server
    store.servers.set('srv_conn_down_site_up', {
      serverId: 'srv_conn_down_site_up',
      hostname: 'hybrid-host-01',
      organizationId: 'org_ryvix_demo',
      provider: 'Bare Metal',
      status: 'degraded',
      cpuPercent: 35,
      memoryPercent: 60,
      diskPercent: 45,
      uptimeSeconds: 1200000,
      loadAverage: [0.55, 0.60, 0.52],
      activeSockets: 310,
      services: [{ name: 'node-backend', status: 'active' }],
      containers: [],
      openPorts: [80, 443, 3000],
      connectorStatus: 'offline', // connector is offline!
      lastTelemetryTimestamp: new Date(now - 15 * 60 * 1000).toISOString(),
      freshnessAgeSeconds: 900,
      isStale: true,
      staleMinutes: 15,
    });

    // 5. Cross-Tenant Server (Belongs to org_tenant_other)
    store.servers.set('srv_tenant_secret', {
      serverId: 'srv_tenant_secret',
      hostname: 'fintech-secure-node',
      organizationId: 'org_tenant_other',
      provider: 'AWS (us-west-2)',
      status: 'healthy',
      cpuPercent: 12,
      memoryPercent: 28,
      diskPercent: 19,
      uptimeSeconds: 999999,
      loadAverage: [0.1, 0.1, 0.1],
      activeSockets: 50,
      services: [{ name: 'ledger', status: 'active' }],
      containers: [],
      openPorts: [443],
      connectorStatus: 'active',
      lastTelemetryTimestamp: new Date(now - 5000).toISOString(),
      freshnessAgeSeconds: 5,
      isStale: false,
    });

    // 6. Websites
    store.websites.set('example.com', {
      url: 'https://example.com',
      organizationId: 'org_ryvix_demo',
      status: 'healthy',
      httpStatusCode: 200,
      responseTimeMs: 184,
      sslValid: true,
      sslDaysRemaining: 84,
      lastProbeTimestamp: new Date(now - 12000).toISOString(),
      freshnessAgeSeconds: 12,
      isStale: false,
    });

    store.websites.set('api.down-site.com', {
      url: 'https://api.down-site.com',
      organizationId: 'org_ryvix_demo',
      status: 'down',
      httpStatusCode: 502,
      responseTimeMs: 4200,
      sslValid: true,
      sslDaysRemaining: 40,
      lastProbeTimestamp: new Date(now - 15000).toISOString(),
      freshnessAgeSeconds: 15,
      isStale: false,
      error: 'HTTP 502 Bad Gateway: Upstream socket on port 3000 connection refused',
    });

    // 7. Deployments
    store.deployments.set('repo_frontend', {
      repositoryId: 'repo_frontend',
      repositoryName: 'ryvix/frontend',
      organizationId: 'org_ryvix_demo',
      latestCommit: {
        sha: 'abc1234',
        message: 'fix: optimize socket connection pooling in web client',
        author: 'developer@ryvix.io',
        timestamp: new Date(now - 14 * 60 * 1000).toISOString(),
      },
      branch: 'main',
      status: 'successful',
      deployedAgoSeconds: 840, // 14 mins ago
      runtimeHealth: 'healthy',
      rollbackAvailable: true,
      rollbackCommitSha: '987fedc',
      buildDurationSeconds: 134,
    });

    store.deployments.set('repo_backend_failed', {
      repositoryId: 'repo_backend_failed',
      repositoryName: 'ryvix/backend-api',
      organizationId: 'org_ryvix_demo',
      latestCommit: {
        sha: 'badc0de',
        message: 'feat: add unindexed heavy join query',
        author: 'dev2@ryvix.io',
        timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
      },
      branch: 'main',
      status: 'failed',
      deployedAgoSeconds: 1800,
      runtimeHealth: 'unhealthy',
      rollbackAvailable: true,
      rollbackCommitSha: 'prev001',
      buildDurationSeconds: 45,
      errorDetails: 'Container crash: listen EADDRINUSE :::3000 during blue-green healthcheck',
    });

    // 8. Server Logs (including repeated failed auth attempts)
    store.serverLogs.set('srv_prod_01', [
      {
        timestamp: new Date(now - 120000).toISOString(),
        level: 'warn',
        service: 'sshd',
        message: 'Failed password for invalid user admin from 198.51.100.22 port 48122 ssh2 (183 repeated attempts in 4 minutes)',
      },
      {
        timestamp: new Date(now - 60000).toISOString(),
        level: 'info',
        service: 'nginx',
        message: '127.0.0.1 - GET /api/health HTTP/1.1 200 42ms',
      },
      {
        timestamp: new Date(now - 30000).toISOString(),
        level: 'info',
        service: 'node-app',
        message: 'Server listening on port 3000. Active connections: 248',
      },
    ]);

    store.serverLogs.set('srv_prod_02', [
      {
        timestamp: new Date(now - 180000).toISOString(),
        level: 'error',
        service: 'node-app',
        message: 'Error: Connection timeout after 5000ms connecting to database pool',
      },
      {
        timestamp: new Date(now - 120000).toISOString(),
        level: 'error',
        service: 'node-app',
        message: 'High CPU alert: event loop lag 1820ms exceeding threshold 200ms',
      },
      {
        timestamp: new Date(now - 45000).toISOString(),
        level: 'error',
        service: 'nginx',
        message: '110: Connection timed out while reading response header from upstream',
      },
    ]);

    // 9. Historical Incidents
    store.incidents.set('srv_prod_01', [
      {
        incidentId: 'inc_20260920_01',
        serverId: 'srv_prod_01',
        organizationId: 'org_ryvix_demo',
        title: 'Port 3000 socket backlog saturation during product launch',
        severity: 'P2_high',
        startedAt: new Date(now - 28 * 3600 * 1000).toISOString(), // yesterday
        resolvedAt: new Date(now - 27 * 3600 * 1000).toISOString(),
        durationMinutes: 60,
        rootCause: 'Linux kernel somaxconn queue defaulted to 128 under 40k req/s traffic spike',
        recoveryActionTaken: 'Autonomous tuning tuned net.core.somaxconn=65535 and reloaded Nginx',
        timeline: [
          { timestamp: new Date(now - 28 * 3600 * 1000).toISOString(), note: 'Latency spiked to 1.8s, 502 errors reported' },
          { timestamp: new Date(now - 27.5 * 3600 * 1000).toISOString(), note: 'Ryvix Self-Healing executed somaxconn resize' },
          { timestamp: new Date(now - 27 * 3600 * 1000).toISOString(), note: 'Synthetic probes returned to 200 OK (latency 42ms)' },
        ],
      },
    ]);
}
