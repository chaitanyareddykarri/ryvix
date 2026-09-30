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

  // Runtime stores start empty. Only verified adapters may populate measurements.

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
