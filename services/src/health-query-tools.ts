/**
 * @file health-query-tools.ts
 * @module @ryvix/services
 *
 * Dedicated Typed Backend Operational Data & Health Tools
 * Strictly mediated by multi-tenant authentication, authorization, and audit layers.
 * The AI Model never has direct SSH, shell, or raw credentials.
 */

export interface HealthQuerySecurityContext {
  userId: string;
  organizationId: string;
  userRole: 'owner' | 'admin' | 'developer' | 'viewer';
  sourceChannel?: 'web' | 'whatsapp' | 'gmail';
}

export interface ServerTelemetryData {
  serverId: string;
  hostname: string;
  organizationId: string;
  provider: string;
  status: 'healthy' | 'degraded' | 'critical' | 'unreachable';
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  uptimeSeconds: number;
  loadAverage: [number, number, number];
  activeSockets: number;
  services: Array<{ name: string; status: 'active' | 'inactive' | 'failed' }>;
  containers: Array<{ id: string; name: string; status: string; memoryUsageMb: number }>;
  openPorts: number[];
  connectorStatus: 'active' | 'offline' | 'degraded';
  lastTelemetryTimestamp: string;
  freshnessAgeSeconds: number;
  isStale: boolean;
  staleMinutes?: number;
}

export interface WebsiteHealthData {
  url: string;
  organizationId: string;
  status: 'healthy' | 'degraded' | 'down';
  httpStatusCode: number;
  responseTimeMs: number;
  sslValid: boolean;
  sslDaysRemaining: number;
  lastProbeTimestamp: string;
  freshnessAgeSeconds: number;
  isStale: boolean;
  error?: string;
}

export interface PortStatusData {
  serverId: string;
  hostname: string;
  port: number;
  isOpen: boolean;
  serviceBound?: string;
  protocol: 'tcp' | 'udp';
  lastCheckedTimestamp: string;
}

export interface DeploymentRecordData {
  repositoryId: string;
  repositoryName: string;
  organizationId: string;
  latestCommit: {
    sha: string;
    message: string;
    author: string;
    timestamp: string;
  };
  branch: string;
  status: 'successful' | 'failed' | 'in_progress';
  deployedAgoSeconds: number;
  runtimeHealth: 'healthy' | 'unhealthy';
  rollbackAvailable: boolean;
  rollbackCommitSha?: string;
  buildDurationSeconds: number;
  errorDetails?: string;
}

export interface ServerLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'critical';
  service: string;
  message: string;
}

export interface HistoricalIncidentData {
  incidentId: string;
  serverId: string;
  organizationId: string;
  title: string;
  severity: 'P1_critical' | 'P2_high' | 'P3_medium' | 'P4_low';
  startedAt: string;
  resolvedAt?: string;
  durationMinutes?: number;
  rootCause: string;
  recoveryActionTaken: string;
  timeline: Array<{ timestamp: string; note: string }>;
}

export interface QueryToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  accessDenied?: boolean;
  notFound?: boolean;
  isStale?: boolean;
  connectorOffline?: boolean;
  externalProbeOk?: boolean;
  ambiguousMatches?: string[];
}

/**
 * In-Memory Master Operational Telemetry Store for Multi-Tenant Health Queries
 */
class CustomerHealthDataStore {
  private servers: Map<string, ServerTelemetryData> = new Map();
  private websites: Map<string, WebsiteHealthData> = new Map();
  private deployments: Map<string, DeploymentRecordData> = new Map();
  private serverLogs: Map<string, ServerLogEntry[]> = new Map();
  private incidents: Map<string, HistoricalIncidentData[]> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  public seedDefaultData(): void {
    const now = Date.now();

    // 1. Healthy Server srv_prod_01 (Org: org_ryvix_demo)
    this.servers.set('srv_prod_01', {
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
    this.servers.set('srv_prod_02', {
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
    this.servers.set('srv_prod_stale', {
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
    this.servers.set('srv_conn_down_site_up', {
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
    this.servers.set('srv_tenant_secret', {
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
    this.websites.set('example.com', {
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

    this.websites.set('api.down-site.com', {
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
    this.deployments.set('repo_frontend', {
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

    this.deployments.set('repo_backend_failed', {
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
    this.serverLogs.set('srv_prod_01', [
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

    this.serverLogs.set('srv_prod_02', [
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
    this.incidents.set('srv_prod_01', [
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

  // --- QUERY APIS WITH MULTI-TENANT AUTHORIZATION ---

  public getServer(serverIdOrHost: string, orgId: string): QueryToolResult<ServerTelemetryData> {
    const term = serverIdOrHost.trim().toLowerCase();
    const matches: ServerTelemetryData[] = [];

    for (const server of this.servers.values()) {
      if (
        server.serverId.toLowerCase() === term ||
        server.hostname.toLowerCase() === term ||
        server.hostname.toLowerCase().includes(term) ||
        server.serverId.toLowerCase().includes(term)
      ) {
        matches.push(server);
      }
    }

    if (matches.length === 0) {
      return { success: false, error: `Server "${serverIdOrHost}" not found in your infrastructure inventory.`, notFound: true };
    }

    // Check ambiguous
    if (matches.length > 1) {
      const exact = matches.find(m => m.serverId.toLowerCase() === term || m.hostname.toLowerCase() === term);
      if (!exact) {
        return {
          success: false,
          error: `Ambiguous server name "${serverIdOrHost}". Multiple servers match.`,
          ambiguousMatches: matches.map(m => `${m.serverId} (${m.hostname})`),
        };
      }
      matches.splice(0, matches.length, exact);
    }

    const server = matches[0];

    // Multi-tenant check
    if (server.organizationId !== orgId) {
      return { success: false, error: 'Access denied: You are not authorized to view telemetry for this server.', accessDenied: true };
    }

    // Recalculate freshness dynamically
    const ageSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(server.lastTelemetryTimestamp)) / 1000));
    const isStale = ageSeconds > 120; // older than 2 minutes is considered stale

    return {
      success: true,
      data: {
        ...server,
        freshnessAgeSeconds: ageSeconds,
        isStale,
        staleMinutes: isStale ? Math.floor(ageSeconds / 60) : undefined,
      },
      isStale,
      connectorOffline: server.connectorStatus === 'offline',
    };
  }

  public getWebsite(urlOrDomain: string, orgId: string): QueryToolResult<WebsiteHealthData> {
    const term = urlOrDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    let matched: WebsiteHealthData | undefined;

    for (const [key, ws] of this.websites.entries()) {
      const cleanKey = key.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (cleanKey === term || ws.url.toLowerCase().includes(term) || cleanKey.includes(term)) {
        matched = ws;
        break;
      }
    }

    if (!matched) {
      return { success: false, error: `Website "${urlOrDomain}" not found in monitoring targets.`, notFound: true };
    }

    if (matched.organizationId !== orgId) {
      return { success: false, error: 'Access denied: Website belongs to another organization.', accessDenied: true };
    }

    const ageSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(matched.lastProbeTimestamp)) / 1000));
    const isStale = ageSeconds > 180;

    return {
      success: true,
      data: {
        ...matched,
        freshnessAgeSeconds: ageSeconds,
        isStale,
      },
      isStale,
    };
  }

  public getPort(serverId: string, port: number, orgId: string): QueryToolResult<PortStatusData> {
    const srvResult = this.getServer(serverId, orgId);
    if (!srvResult.success || !srvResult.data) {
      return { success: false, error: srvResult.error, accessDenied: srvResult.accessDenied, notFound: srvResult.notFound };
    }

    const srv = srvResult.data;
    const isOpen = srv.openPorts.includes(port);

    let serviceBound = undefined;
    if (port === 80 || port === 443) serviceBound = 'nginx';
    else if (port === 3000) serviceBound = 'node-app';
    else if (port === 5432) serviceBound = 'postgresql';
    else if (port === 8080) serviceBound = 'worker-queue';

    return {
      success: true,
      data: {
        serverId: srv.serverId,
        hostname: srv.hostname,
        port,
        isOpen,
        serviceBound: isOpen ? serviceBound : undefined,
        protocol: 'tcp',
        lastCheckedTimestamp: new Date().toISOString(),
      },
    };
  }

  public getDeployment(repoOrName: string, orgId: string): QueryToolResult<DeploymentRecordData> {
    const term = repoOrName.trim().toLowerCase();
    let matched: DeploymentRecordData | undefined;

    for (const dep of this.deployments.values()) {
      if (
        dep.repositoryId.toLowerCase() === term ||
        dep.repositoryName.toLowerCase() === term ||
        dep.repositoryName.toLowerCase().includes(term) ||
        dep.latestCommit.sha.toLowerCase() === term
      ) {
        matched = dep;
        break;
      }
    }

    if (!matched) {
      // Default to first deployment for org if user asks generally about "latest deployment"
      for (const dep of this.deployments.values()) {
        if (dep.organizationId === orgId) {
          matched = dep;
          break;
        }
      }
    }

    if (!matched) {
      return { success: false, error: `No deployment records found for "${repoOrName}".`, notFound: true };
    }

    if (matched.organizationId !== orgId) {
      return { success: false, error: 'Access denied: Repository belongs to another organization.', accessDenied: true };
    }

    return {
      success: true,
      data: matched,
    };
  }

  public getLogs(serverId: string, orgId: string): QueryToolResult<ServerLogEntry[]> {
    const srvResult = this.getServer(serverId, orgId);
    if (!srvResult.success) {
      return { success: false, error: srvResult.error, accessDenied: srvResult.accessDenied, notFound: srvResult.notFound };
    }

    const logs = this.serverLogs.get(srvResult.data!.serverId) || [];
    return {
      success: true,
      data: logs,
    };
  }

  public getIncidents(serverId: string, orgId: string): QueryToolResult<HistoricalIncidentData[]> {
    const srvResult = this.getServer(serverId, orgId);
    if (!srvResult.success) {
      return { success: false, error: srvResult.error, accessDenied: srvResult.accessDenied, notFound: srvResult.notFound };
    }

    const incs = this.incidents.get(srvResult.data!.serverId) || [];
    return {
      success: true,
      data: incs,
    };
  }

  public listServers(orgId: string): ServerTelemetryData[] {
    return Array.from(this.servers.values()).filter(s => s.organizationId === orgId);
  }

  public listWebsites(orgId: string): WebsiteHealthData[] {
    return Array.from(this.websites.values()).filter(w => w.organizationId === orgId);
  }

  // Setter helper for test simulation
  public setServer(server: ServerTelemetryData): void {
    this.servers.set(server.serverId, server);
  }

  public setWebsite(website: WebsiteHealthData): void {
    this.websites.set(website.url, website);
  }

  public setDeployment(deployment: DeploymentRecordData): void {
    this.deployments.set(deployment.repositoryId, deployment);
  }

  public setLogs(serverId: string, logs: ServerLogEntry[]): void {
    this.serverLogs.set(serverId, logs);
  }

  public setIncidents(serverId: string, incidents: HistoricalIncidentData[]): void {
    this.incidents.set(serverId, incidents);
  }
}

export const customerHealthStore = new CustomerHealthDataStore();

/**
 * Controlled Backend Tool Functions (Mediated Layer)
 * Validates SecurityContext and executes typed queries.
 */
export async function queryServerTelemetry(
  serverId: string,
  context: HealthQuerySecurityContext
): Promise<QueryToolResult<ServerTelemetryData>> {
  if (!context.userId || !context.organizationId) {
    return { success: false, error: 'Unauthorized: Missing user or organization context.', accessDenied: true };
  }
  return customerHealthStore.getServer(serverId, context.organizationId);
}

export async function queryWebsiteHealth(
  urlOrDomain: string,
  context: HealthQuerySecurityContext
): Promise<QueryToolResult<WebsiteHealthData>> {
  if (!context.userId || !context.organizationId) {
    return { success: false, error: 'Unauthorized: Missing user or organization context.', accessDenied: true };
  }
  return customerHealthStore.getWebsite(urlOrDomain, context.organizationId);
}

export async function queryPortStatus(
  serverId: string,
  port: number,
  context: HealthQuerySecurityContext
): Promise<QueryToolResult<PortStatusData>> {
  if (!context.userId || !context.organizationId) {
    return { success: false, error: 'Unauthorized: Missing user or organization context.', accessDenied: true };
  }
  return customerHealthStore.getPort(serverId, port, context.organizationId);
}

export async function queryDeploymentStatus(
  repoOrCommit: string,
  context: HealthQuerySecurityContext
): Promise<QueryToolResult<DeploymentRecordData>> {
  if (!context.userId || !context.organizationId) {
    return { success: false, error: 'Unauthorized: Missing user or organization context.', accessDenied: true };
  }
  return customerHealthStore.getDeployment(repoOrCommit, context.organizationId);
}

export async function queryServerLogs(
  serverId: string,
  context: HealthQuerySecurityContext
): Promise<QueryToolResult<ServerLogEntry[]>> {
  if (!context.userId || !context.organizationId) {
    return { success: false, error: 'Unauthorized: Missing user or organization context.', accessDenied: true };
  }
  return customerHealthStore.getLogs(serverId, context.organizationId);
}

export async function queryHistoricalIncidents(
  serverId: string,
  context: HealthQuerySecurityContext
): Promise<QueryToolResult<HistoricalIncidentData[]>> {
  if (!context.userId || !context.organizationId) {
    return { success: false, error: 'Unauthorized: Missing user or organization context.', accessDenied: true };
  }
  return customerHealthStore.getIncidents(serverId, context.organizationId);
}
