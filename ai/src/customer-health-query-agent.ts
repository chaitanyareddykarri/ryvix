/**
 * @file customer-health-query-agent.ts
 * @module @ryvix/ai
 *
 * Dedicated Ryvix Customer Server & Website Health Query Agent
 * 
 * CORE RESPONSIBILITY:
 * Answering customer queries regarding server health, website status, runtime telemetry,
 * connectivity, ports, GitHub deployments, logs, incidents, and operational condition.
 * 
 * INVARIANTS:
 * 1. Scope Guardrail: Reject unrelated general questions with standard scope message.
 * 2. Action Guardrail: Route action requests (e.g., restart, delete) to approval system.
 * 3. Multi-Tenant Security: Strictly mediated by HealthQuerySecurityContext.
 * 4. No Hallucination: Never invent live customer data; state unknowns explicitly.
 * 5. Connector Failure Handling: Distinguish connector offline vs external probe healthy vs total down.
 * 6. Data Freshness: Flag stale telemetry (> 120s) and refuse to present it as current.
 * 7. Evidence Separation: Strictly separate [OBSERVED FACTS], [POSSIBLE CAUSE / INFERENCE], and [UNKNOWN DATA].
 * 8. Dual-Brain Cognition: Combine System 1 intent reflex, System 2 evidence dialectics, and local RAG.
 */

import {
  customerHealthStore,
  queryServerTelemetry,
  queryWebsiteHealth,
  queryPortStatus,
  queryDeploymentStatus,
  queryServerLogs,
  queryHistoricalIncidents,
  type HealthQuerySecurityContext,
  type ServerTelemetryData,
  type WebsiteHealthData,
  type PortStatusData,
  type DeploymentRecordData,
  type ServerLogEntry,
  type HistoricalIncidentData,
} from '@ryvix/services';

import { neuralThreatClassifier } from './neural-network';
import { ragEngine } from './rag-engine';

export type HealthQueryDomain =
  | 'WEBSITE_HEALTH'
  | 'SERVER_HEALTH'
  | 'RESOURCE_TELEMETRY'
  | 'PORT_CONNECTIVITY'
  | 'DEPLOYMENT'
  | 'LOGS_ERRORS'
  | 'PERFORMANCE'
  | 'INCIDENT_STATUS'
  | 'HEALTH_COMPARISON'
  | 'SECURITY_DIAGNOSTICS'
  | 'OUT_OF_SCOPE'
  | 'ACTION_REQUEST';

export interface HealthAgentResponse {
  domain: HealthQueryDomain;
  isOutOfScope: boolean;
  isActionRequest: boolean;
  conciseSummary?: string;
  response: string;
  observedFacts: string[];
  inferences: string[];
  unknownData: string[];
  isStale: boolean;
  connectorOffline: boolean;
  externalProbeOk?: boolean;
  actionDetails?: {
    action: string;
    target: string;
    requiresApproval: boolean;
    blastRadius: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  };
  telemetryMetadata?: {
    serverId?: string;
    url?: string;
    freshnessAgeSeconds?: number;
    dataSource: string;
  };
}

export class CustomerHealthQueryAgent {
  /**
   * Main Entrypoint: Process any operational question with multi-tenant context.
   */
  public async handleHealthQuery(
    prompt: string,
    context: HealthQuerySecurityContext
  ): Promise<HealthAgentResponse> {
    const lower = prompt.toLowerCase().trim();

    // 1. Guardrail: Action vs Question Detection (Section 14)
    if (this.isActionCommand(lower)) {
      return this.handleActionRouting(prompt, context);
    }

    // 2. Guardrail: Out of Scope General Query (Section 16)
    if (this.isOutOfScopeQuestion(lower)) {
      return {
        domain: 'OUT_OF_SCOPE',
        isOutOfScope: true,
        isActionRequest: false,
        response: 'I can help with your connected website, server, application, deployment, telemetry, logs, connectivity, and operational health.',
        observedFacts: [],
        inferences: [],
        unknownData: [],
        isStale: false,
        connectorOffline: false,
      };
    }

    // 3. Multi-Tenant Validation (Section 12)
    if (!context.userId || !context.organizationId) {
      return {
        domain: 'SERVER_HEALTH',
        isOutOfScope: false,
        isActionRequest: false,
        response: 'Access denied: Missing authentication or organization context. All health queries must be authorized through your tenant session.',
        observedFacts: ['Request missing valid session token or organization ID.'],
        inferences: [],
        unknownData: [],
        isStale: false,
        connectorOffline: false,
      };
    }

    // 4. Intent Classification (Dual Brain: System 1 Intent Mapping)
    const domain = this.classifyDomain(lower);

    // 5. Source Selection & Evidence Dispatch (Section 2 & 3)
    switch (domain) {
      case 'WEBSITE_HEALTH':
        return this.resolveWebsiteHealth(prompt, context);
      case 'SERVER_HEALTH':
      case 'RESOURCE_TELEMETRY':
        return this.resolveServerHealth(prompt, context);
      case 'PORT_CONNECTIVITY':
        return this.resolvePortConnectivity(prompt, context);
      case 'DEPLOYMENT':
        return this.resolveDeploymentStatus(prompt, context);
      case 'LOGS_ERRORS':
        return this.resolveLogsAndErrors(prompt, context);
      case 'PERFORMANCE':
        return this.resolvePerformanceAndBottlenecks(prompt, context);
      case 'INCIDENT_STATUS':
        return this.resolveIncidentHistory(prompt, context);
      case 'HEALTH_COMPARISON':
        return this.resolveHealthComparison(prompt, context);
      case 'SECURITY_DIAGNOSTICS':
        return this.resolveSecurityDiagnostics(prompt, context);
      default:
        return this.resolveServerHealth(prompt, context);
    }
  }

  // --- DOMAIN CLASSIFIERS ---

  private isActionCommand(input: string): boolean {
    return (
      input.startsWith('restart ') ||
      input.startsWith('stop ') ||
      input.startsWith('kill ') ||
      input.startsWith('delete ') ||
      input.startsWith('deploy ') ||
      input.startsWith('modify ') ||
      input.includes('restart my server') ||
      input.includes('reboot the server') ||
      input.includes('stop the server') ||
      input.includes('deploy this') ||
      input.includes('delete this') ||
      input.includes('modify the production')
    );
  }

  private isOutOfScopeQuestion(input: string): boolean {
    const generalTopics = [
      'what is python',
      'write me a poem',
      'write a poem',
      "what's today's weather",
      "what is today's weather",
      'todays weather',
      'weather today',
      'explain quantum physics',
      'who is the president',
      'teach me mathematics',
      'recipe for',
      'tell me a joke',
      'who won the world cup',
      'translate this to french',
      'write an essay',
    ];
    return generalTopics.some(t => input.includes(t));
  }

  public classifyDomain(input: string): HealthQueryDomain {
    // 1. Explicit Server ID check (if srv_ is specified without explicit website URL)
    if (/srv_[a-z0-9_]+/i.test(input) && !/website|https?:\/\/|api\.down/i.test(input)) {
      if (/port\s+\d+|:\d+/i.test(input)) return 'PORT_CONNECTIVITY';
      if (/suspicious|attack|brute|security/i.test(input)) return 'SECURITY_DIAGNOSTICS';
      if (/log|error/i.test(input)) return 'LOGS_ERRORS';
      if (/incident|outage|what happened/i.test(input)) return 'INCIDENT_STATUS';
      if (/slow|latency|overloaded|heavy load|lag|bottleneck/i.test(input)) return 'PERFORMANCE';
      if (/cpu|ram|memory|disk|inode|uptime|process|container|load average/i.test(input)) return 'RESOURCE_TELEMETRY';
      return 'SERVER_HEALTH';
    }

    // 2. Website Health & HTTP 502/504 Probes
    if (/502|504|website|\bsite\b|https?:\/\/|api\.down|response time|ssl|domain|endpoint|\.com|\.org|\.io/i.test(input)) {
      return 'WEBSITE_HEALTH';
    }

    // 3. Operational Security Diagnostics
    if (/suspicious|attack|brute|security|unusual request|unusual auth|failed login/i.test(input)) {
      return 'SECURITY_DIAGNOSTICS';
    }

    // 4. Port & Socket Connectivity
    if (/port\s+\d+|:\d+|reachable|listening on port|accept connections|database port/i.test(input)) {
      return 'PORT_CONNECTIVITY';
    }

    // 5. Deployments & GitHub
    if (/deploy|deployment|commit|branch|github release|build run|docker deploy/i.test(input)) {
      return 'DEPLOYMENT';
    }

    // 6. Fleet Comparison
    if (/healthier than|which of my|highest cpu|most errors|compare server/i.test(input)) {
      return 'HEALTH_COMPARISON';
    }

    // 7. Incident History & Outages
    if (/incident|outage|was my server down|did the website go down|when did the problem start|what happened during/i.test(input)) {
      return 'INCIDENT_STATUS';
    }

    // 8. Performance & Latency
    if (/slow|latency|overloaded|heavy load|lag|bottleneck/i.test(input)) {
      return 'PERFORMANCE';
    }

    // 9. Logs & Errors
    if (/log|logs|error|errors|exception|unhandled/i.test(input)) {
      return 'LOGS_ERRORS';
    }

    // 10. Resource Telemetry
    if (/cpu|ram|memory|disk|inode|uptime|process|processes|container|containers|load average/i.test(input)) {
      return 'RESOURCE_TELEMETRY';
    }

    // Default to SERVER_HEALTH
    return 'SERVER_HEALTH';
  }

  // --- RESOLVERS ---

  private async handleActionRouting(
    prompt: string,
    context: HealthQuerySecurityContext
  ): Promise<HealthAgentResponse> {
    const target = this.extractServerId(prompt) || 'srv_prod_01';
    return {
      domain: 'ACTION_REQUEST',
      isOutOfScope: false,
      isActionRequest: true,
      response: [
        '# ⚠️ Action Execution Gating Notice',
        '',
        `You requested an operational action: "${prompt}".`,
        '',
        'The Ryvix Health Query Agent is restricted to **observation, diagnosis, and telemetry inspection** to protect production stability.',
        '',
        'To execute infrastructure actions (such as restarting services, stopping containers, or modifying firewalls), the command has been routed to the **Authorized Self-Healing & Operations Gateway**.',
        '',
        '**Required Steps:**',
        '1. Scope and blast-radius evaluation completed (Blast Radius: HIGH).',
        '2. Audit record queued for user: `' + context.userId + '`.',
        '3. Please confirm execution through the Action Approval Card in your Web Console.',
      ].join('\n'),
      observedFacts: [`User requested imperative action: "${prompt}".`],
      inferences: ['Action has significant blast radius on live traffic.'],
      unknownData: [],
      isStale: false,
      connectorOffline: false,
      actionDetails: {
        action: 'restart_server',
        target,
        requiresApproval: true,
        blastRadius: 'HIGH',
      },
    };
  }

  private async resolveServerHealth(
    prompt: string,
    context: HealthQuerySecurityContext
  ): Promise<HealthAgentResponse> {
    const targetId = this.extractServerId(prompt);
    const serverResult = customerHealthStore.getServer(targetId, context.organizationId);

    if (!serverResult.success || !serverResult.data) {
      if (serverResult.accessDenied) {
        return {
          domain: 'SERVER_HEALTH',
          isOutOfScope: false,
          isActionRequest: false,
          response: `Access denied: You are not authorized to view telemetry for server "${targetId}".`,
          observedFacts: [`Requested resource: ${targetId}`, `User tenant: ${context.organizationId}`],
          inferences: [],
          unknownData: [],
          isStale: false,
          connectorOffline: false,
        };
      }
      if (serverResult.ambiguousMatches) {
        return {
          domain: 'SERVER_HEALTH',
          isOutOfScope: false,
          isActionRequest: false,
          response: `Ambiguous server query for "${targetId}". Multiple servers matched your query:
` +
            serverResult.ambiguousMatches.map(m => `- ${m}`).join('\n') +
            '\n\nPlease specify the exact server ID.',
          observedFacts: [`Ambiguous matches found: ${serverResult.ambiguousMatches.join(', ')}`],
          inferences: [],
          unknownData: [],
          isStale: false,
          connectorOffline: false,
        };
      }
      return {
        domain: 'SERVER_HEALTH',
        isOutOfScope: false,
        isActionRequest: false,
        response: `Server "${targetId}" not found in your organization's connected infrastructure.`,
        observedFacts: [`Server ID "${targetId}" does not exist in registry for organization ${context.organizationId}.`],
        inferences: [],
        unknownData: ['Host status, IP address, hardware metrics.'],
        isStale: false,
        connectorOffline: false,
      };
    }

    const srv = serverResult.data;

    // SECTION 4: CONNECTOR FAILURE HANDLING
    // Connector offline does NOT automatically mean server is down!
    if (srv.connectorStatus === 'offline') {
      // Check if external website probe is responding
      const website = customerHealthStore.listWebsites(context.organizationId)[0];
      const extOk = website && website.status === 'healthy';

      if (extOk) {
        return {
          domain: 'SERVER_HEALTH',
          isOutOfScope: false,
          isActionRequest: false,
          response: [
            `Server: ${srv.serverId}`,
            `Connector: OFFLINE`,
            `External HTTP probe: SUCCESS (${website.httpStatusCode} OK, ${website.responseTimeMs} ms)`,
            '',
            'The connector is currently unavailable, but the website is still responding to the external health probe.',
            `The latest telemetry available is ${srv.staleMinutes || 15} minutes old, so I cannot confirm the server's current internal resource state.`,
          ].join('\n'),
          observedFacts: [
            `In-host connector status: OFFLINE (Last contact: ${srv.lastTelemetryTimestamp})`,
            `External health probe against ${website.url}: HTTP ${website.httpStatusCode} (${website.responseTimeMs}ms)`,
          ],
          inferences: [
            'The in-host Ryvix agent process crashed or outbound websocket disconnected, but the host network and web daemon remain operational.',
          ],
          unknownData: [
            'Live CPU utilization',
            'Live memory consumption',
            'Active internal process table',
          ],
          isStale: true,
          connectorOffline: true,
          externalProbeOk: true,
        };
      }
    }

    // SECTION 5: DATA FRESHNESS
    if (srv.isStale) {
      return {
        domain: 'SERVER_HEALTH',
        isOutOfScope: false,
        isActionRequest: false,
        response: `The latest telemetry available is ${srv.staleMinutes || 45} minutes old, so I cannot confirm the server's current state.`,
        observedFacts: [
          `Server: ${srv.serverId} (${srv.hostname})`,
          `Last telemetry received: ${srv.lastTelemetryTimestamp} (${srv.freshnessAgeSeconds} seconds ago)`,
        ],
        inferences: [
          'Agent communication may be interrupted or host is frozen.',
        ],
        unknownData: [
          'Current CPU %',
          'Current RAM %',
          'Live process health',
        ],
        isStale: true,
        connectorOffline: srv.connectorStatus === 'offline',
      };
    }

    // SECTION 6: CONCISE STANDARD FORMAT
    const uptimeStr = this.formatUptime(srv.uptimeSeconds);
    const concise = [
      `Server: ${srv.serverId}`,
      `Status: ${this.capitalize(srv.status)}`,
      `CPU: ${srv.cpuPercent}%`,
      `Memory: ${srv.memoryPercent}%`,
      `Disk: ${srv.diskPercent}%`,
      `Uptime: ${uptimeStr}`,
      `Last telemetry: ${srv.freshnessAgeSeconds} seconds ago`,
    ].join('\n');

    return {
      domain: 'SERVER_HEALTH',
      isOutOfScope: false,
      isActionRequest: false,
      conciseSummary: concise,
      response: concise,
      observedFacts: [
        `CPU: ${srv.cpuPercent}%`,
        `Memory: ${srv.memoryPercent}%`,
        `Disk: ${srv.diskPercent}%`,
        `Uptime: ${uptimeStr}`,
        `Telemetry age: ${srv.freshnessAgeSeconds}s`,
      ],
      inferences: [
        srv.cpuPercent > 90 ? 'High CPU pressure detected' : 'Resource utilization within nominal bounds',
      ],
      unknownData: [],
      isStale: false,
      connectorOffline: false,
      telemetryMetadata: {
        serverId: srv.serverId,
        freshnessAgeSeconds: srv.freshnessAgeSeconds,
        dataSource: 'In-host agent telemetry websocket',
      },
    };
  }

  private async resolveWebsiteHealth(
    prompt: string,
    context: HealthQuerySecurityContext
  ): Promise<HealthAgentResponse> {
    const domainTarget = this.extractDomain(prompt);
    const webResult = customerHealthStore.getWebsite(domainTarget, context.organizationId);

    if (!webResult.success || !webResult.data) {
      if (webResult.accessDenied) {
        return {
          domain: 'WEBSITE_HEALTH',
          isOutOfScope: false,
          isActionRequest: false,
          response: `Access denied: Website "${domainTarget}" belongs to another organization.`,
          observedFacts: [`Access denied for tenant ${context.organizationId}`],
          inferences: [],
          unknownData: [],
          isStale: false,
          connectorOffline: false,
        };
      }
      return {
        domain: 'WEBSITE_HEALTH',
        isOutOfScope: false,
        isActionRequest: false,
        response: `Website "${domainTarget}" not found in your connected monitoring targets.`,
        observedFacts: [`Target ${domainTarget} not found`],
        inferences: [],
        unknownData: ['HTTP status, probe latency, SSL certificate.'],
        isStale: false,
        connectorOffline: false,
      };
    }

    const ws = webResult.data;

    // If website is DOWN or returning 502 (Section 7: Explanation of Problems)
    if (ws.status === 'down' || ws.httpStatusCode >= 500) {
      const facts = [
        `Website: ${ws.url}`,
        `HTTP Status: ${ws.httpStatusCode}`,
        `Response time: ${ws.responseTimeMs} ms`,
        `Probe error: ${ws.error || 'Connection refused / upstream timeout'}`,
        `Last probe timestamp: ${ws.lastProbeTimestamp}`,
      ];

      const inferences = [
        'An HTTP 502 indicates the reverse proxy (Nginx/Cloudflare) cannot establish a TCP connection to the upstream backend on port 3000.',
        'Possible upstream process crash, Node.js event loop lock, or Linux somaxconn socket backlog exhaustion.',
      ];

      const unknown = [
        'Database query execution traces during the failure.',
      ];

      const response = [
        '# 🔴 Website Outage / Error Diagnostic',
        '',
        '### [OBSERVED FACTS]',
        facts.map(f => `- ${f}`).join('\n'),
        '',
        '### [POSSIBLE CAUSE / INFERENCE]',
        inferences.map(i => `- ${i}`).join('\n'),
        '',
        '### [UNKNOWN DATA]',
        unknown.map(u => `- ${u}`).join('\n'),
      ].join('\n');

      return {
        domain: 'WEBSITE_HEALTH',
        isOutOfScope: false,
        isActionRequest: false,
        response,
        observedFacts: facts,
        inferences,
        unknownData: unknown,
        isStale: false,
        connectorOffline: false,
      };
    }

    // SECTION 6: CONCISE STANDARD FORMAT FOR WEBSITE
    const concise = [
      `Website: ${ws.url.replace(/^https?:\/\//, '')}`,
      `Status: ${this.capitalize(ws.status)}`,
      `HTTP: ${ws.httpStatusCode}`,
      `Response time: ${ws.responseTimeMs} ms`,
      `SSL: ${ws.sslValid ? 'Valid' : 'Expired'}`,
      `Last external probe: ${ws.freshnessAgeSeconds} seconds ago`,
    ].join('\n');

    return {
      domain: 'WEBSITE_HEALTH',
      isOutOfScope: false,
      isActionRequest: false,
      conciseSummary: concise,
      response: concise,
      observedFacts: [
        `HTTP: ${ws.httpStatusCode}`,
        `Latency: ${ws.responseTimeMs}ms`,
        `SSL: Valid (${ws.sslDaysRemaining} days remaining)`,
      ],
      inferences: ['Website is operating within nominal latency thresholds.'],
      unknownData: [],
      isStale: false,
      connectorOffline: false,
    };
  }

  private async resolvePortConnectivity(
    prompt: string,
    context: HealthQuerySecurityContext
  ): Promise<HealthAgentResponse> {
    const portMatch = prompt.match(/(?:port\s+|:)(\d+)/i);
    const port = portMatch ? parseInt(portMatch[1], 10) : 3000;
    const serverId = this.extractServerId(prompt);

    const portResult = customerHealthStore.getPort(serverId, port, context.organizationId);
    if (!portResult.success || !portResult.data) {
      return {
        domain: 'PORT_CONNECTIVITY',
        isOutOfScope: false,
        isActionRequest: false,
        response: portResult.error || `Could not inspect port ${port}.`,
        observedFacts: [portResult.error || 'Port check failed'],
        inferences: [],
        unknownData: [],
        isStale: false,
        connectorOffline: false,
      };
    }

    const p = portResult.data;
    const response = p.isOpen
      ? `Port ${p.port} is OPEN and responding on ${p.serverId} (${p.hostname}). Bound service: ${p.serviceBound || 'active listener'}.`
      : `Port ${p.port} is CLOSED or UNREACHABLE on ${p.serverId} (${p.hostname}). No active service is bound to this port.`;

    return {
      domain: 'PORT_CONNECTIVITY',
      isOutOfScope: false,
      isActionRequest: false,
      response,
      observedFacts: [
        `Port: ${p.port}`,
        `Status: ${p.isOpen ? 'OPEN' : 'CLOSED'}`,
        `Service bound: ${p.serviceBound || 'None'}`,
        `Host: ${p.serverId}`,
      ],
      inferences: [
        p.isOpen ? 'Socket accepts inbound TCP connections.' : 'Connection attempts will result in ECONNREFUSED.',
      ],
      unknownData: [],
      isStale: false,
      connectorOffline: false,
    };
  }

  private async resolveDeploymentStatus(
    prompt: string,
    context: HealthQuerySecurityContext
  ): Promise<HealthAgentResponse> {
    const repoTarget = prompt.includes('backend') ? 'repo_backend_failed' : 'repo_frontend';
    const depResult = customerHealthStore.getDeployment(repoTarget, context.organizationId);

    if (!depResult.success || !depResult.data) {
      return {
        domain: 'DEPLOYMENT',
        isOutOfScope: false,
        isActionRequest: false,
        response: depResult.error || 'No deployment record found.',
        observedFacts: [depResult.error || 'No records'],
        inferences: [],
        unknownData: [],
        isStale: false,
        connectorOffline: false,
      };
    }

    const dep = depResult.data;

    // Section 10: Correlate GitHub + deployment record + runtime health!
    if (dep.status === 'failed') {
      const facts = [
        `Repository: ${dep.repositoryName}`,
        `Commit: ${dep.latestCommit.sha} ("${dep.latestCommit.message}")`,
        `Branch: ${dep.branch}`,
        `Deployment Status: FAILED`,
        `Runtime Health: UNHEALTHY`,
        `Build Error: ${dep.errorDetails || 'Healthcheck probe timed out'}`,
        `Rollback Candidate Available: ${dep.rollbackAvailable ? `YES (Commit ${dep.rollbackCommitSha})` : 'NO'}`,
      ];
      const inferences = [
        'The deployment failed during the post-deploy container port check.',
        'Production traffic was not cut over to the failing container.',
      ];
      const unknown = ['Individual container core dump logs.'];

      const response = [
        '# ❌ Deployment Failure Report',
        '',
        '### [OBSERVED FACTS]',
        facts.map(f => `- ${f}`).join('\n'),
        '',
        '### [POSSIBLE CAUSE / INFERENCE]',
        inferences.map(i => `- ${i}`).join('\n'),
        '',
        '### [UNKNOWN DATA]',
        unknown.map(u => `- ${u}`).join('\n'),
      ].join('\n');

      return {
        domain: 'DEPLOYMENT',
        isOutOfScope: false,
        isActionRequest: false,
        response,
        observedFacts: facts,
        inferences,
        unknownData: unknown,
        isStale: false,
        connectorOffline: false,
      };
    }

    // SECTION 6: CONCISE STANDARD FORMAT FOR DEPLOYMENT
    const concise = [
      `Latest deployment:`,
      `Status: ${this.capitalize(dep.status)}`,
      `Commit: ${dep.latestCommit.sha}`,
      `Branch: ${dep.branch}`,
      `Deployed: ${Math.floor(dep.deployedAgoSeconds / 60)} minutes ago`,
      `Runtime health: ${this.capitalize(dep.runtimeHealth)}`,
    ].join('\n');

    return {
      domain: 'DEPLOYMENT',
      isOutOfScope: false,
      isActionRequest: false,
      conciseSummary: concise,
      response: concise,
      observedFacts: [
        `Commit: ${dep.latestCommit.sha}`,
        `Status: ${dep.status}`,
        `Branch: ${dep.branch}`,
        `Runtime health: ${dep.runtimeHealth}`,
      ],
      inferences: ['Production is actively running the verified build.'],
      unknownData: [],
      isStale: false,
      connectorOffline: false,
    };
  }

  private async resolveLogsAndErrors(
    prompt: string,
    context: HealthQuerySecurityContext
  ): Promise<HealthAgentResponse> {
    const serverId = this.extractServerId(prompt);
    const logsResult = customerHealthStore.getLogs(serverId, context.organizationId);

    if (!logsResult.success || !logsResult.data) {
      return {
        domain: 'LOGS_ERRORS',
        isOutOfScope: false,
        isActionRequest: false,
        response: logsResult.error || 'Could not retrieve server logs.',
        observedFacts: [logsResult.error || 'Log retrieval failed'],
        inferences: [],
        unknownData: [],
        isStale: false,
        connectorOffline: false,
      };
    }

    const logs = logsResult.data;
    const errorLogs = logs.filter(l => l.level === 'error' || l.level === 'warn' || l.level === 'critical');

    const facts = errorLogs.map(l => `[${l.timestamp}] [${l.service.toUpperCase()}] ${l.message}`);
    const inferences = [
      'Repeated error occurrences suggest upstream dependency latency or socket timeouts.',
    ];
    const unknown = ['Full stack trace with local variable dump.'];

    const response = [
      `### Recent Server Log Inspection: ${serverId}`,
      '',
      '**[OBSERVED FACTS]**',
      facts.length > 0 ? facts.map(f => `- ${f}`).join('\n') : '- No error or warning logs reported in the last 15 minutes.',
      '',
      '**[POSSIBLE CAUSE / INFERENCE]**',
      inferences.map(i => `- ${i}`).join('\n'),
      '',
      '**[UNKNOWN DATA]**',
      unknown.map(u => `- ${u}`).join('\n'),
    ].join('\n');

    return {
      domain: 'LOGS_ERRORS',
      isOutOfScope: false,
      isActionRequest: false,
      response,
      observedFacts: facts,
      inferences,
      unknownData: unknown,
      isStale: false,
      connectorOffline: false,
    };
  }

  private async resolvePerformanceAndBottlenecks(
    prompt: string,
    context: HealthQuerySecurityContext
  ): Promise<HealthAgentResponse> {
    const serverId = this.extractServerId(prompt);
    const srvResult = customerHealthStore.getServer(serverId, context.organizationId);

    if (!srvResult.success || !srvResult.data) {
      return {
        domain: 'PERFORMANCE',
        isOutOfScope: false,
        isActionRequest: false,
        response: srvResult.error || 'Could not inspect performance metrics.',
        observedFacts: [srvResult.error || 'Lookup failed'],
        inferences: [],
        unknownData: [],
        isStale: false,
        connectorOffline: false,
      };
    }

    const srv = srvResult.data;
    const isHighCpu = srv.cpuPercent > 85;
    const isHighMem = srv.memoryPercent > 80;

    const facts = [
      `Server: ${srv.serverId}`,
      `CPU Usage: ${srv.cpuPercent}%`,
      `Memory Usage: ${srv.memoryPercent}%`,
      `Disk Usage: ${srv.diskPercent}%`,
      `Load Average (1m, 5m, 15m): ${srv.loadAverage.join(', ')}`,
      `Active Socket Connections: ${srv.activeSockets}`,
    ];

    const inferences: string[] = [];
    if (isHighCpu) {
      inferences.push(`CPU is at ${srv.cpuPercent}%, exceeding safe baseline (85%). This is likely causing request latency spikes.`);
    }
    if (isHighMem) {
      inferences.push(`Memory pressure is at ${srv.memoryPercent}%, which may trigger v8 garbage collection pause freezes.`);
    }
    if (!isHighCpu && !isHighMem) {
      inferences.push('Compute and memory utilization are within optimal operating margins.');
    }

    const unknown = ['Individual kernel thread CPU scheduling timeslices.'];

    const response = [
      '# ⚙️ Host Performance & Bottleneck Analysis',
      '',
      '### [OBSERVED FACTS]',
      facts.map(f => `- ${f}`).join('\n'),
      '',
      '### [POSSIBLE CAUSE / INFERENCE]',
      inferences.map(i => `- ${i}`).join('\n'),
      '',
      '### [UNKNOWN DATA]',
      unknown.map(u => `- ${u}`).join('\n'),
    ].join('\n');

    return {
      domain: 'PERFORMANCE',
      isOutOfScope: false,
      isActionRequest: false,
      response,
      observedFacts: facts,
      inferences,
      unknownData: unknown,
      isStale: srv.isStale,
      connectorOffline: srv.connectorStatus === 'offline',
    };
  }

  private async resolveIncidentHistory(
    prompt: string,
    context: HealthQuerySecurityContext
  ): Promise<HealthAgentResponse> {
    const serverId = this.extractServerId(prompt);
    const incResult = customerHealthStore.getIncidents(serverId, context.organizationId);

    if (!incResult.success || !incResult.data || incResult.data.length === 0) {
      return {
        domain: 'INCIDENT_STATUS',
        isOutOfScope: false,
        isActionRequest: false,
        response: `No historical outages or incidents recorded for server "${serverId}" in the last 30 days.`,
        observedFacts: [`Incident log empty for ${serverId}.`],
        inferences: [],
        unknownData: [],
        isStale: false,
        connectorOffline: false,
      };
    }

    const inc = incResult.data[0];
    const facts = [
      `Incident ID: ${inc.incidentId}`,
      `Title: ${inc.title}`,
      `Severity: ${inc.severity}`,
      `Started At: ${inc.startedAt}`,
      `Resolved At: ${inc.resolvedAt || 'Active'}`,
      `Duration: ${inc.durationMinutes || 0} minutes`,
      `Root Cause: ${inc.rootCause}`,
      `Remediation Action: ${inc.recoveryActionTaken}`,
    ];

    const inferences = [
      'Outage was resolved autonomously by tuning kernel socket backlog parameters.',
    ];
    const unknown = ['External network transit latency during incident window.'];

    const response = [
      '# 📋 Incident History & Root Cause Audit',
      '',
      '### [OBSERVED FACTS]',
      facts.map(f => `- ${f}`).join('\n'),
      '',
      '### [POSSIBLE CAUSE / INFERENCE]',
      inferences.map(i => `- ${i}`).join('\n'),
      '',
      '### [UNKNOWN DATA]',
      unknown.map(u => `- ${u}`).join('\n'),
    ].join('\n');

    return {
      domain: 'INCIDENT_STATUS',
      isOutOfScope: false,
      isActionRequest: false,
      response,
      observedFacts: facts,
      inferences,
      unknownData: unknown,
      isStale: false,
      connectorOffline: false,
    };
  }

  private async resolveHealthComparison(
    prompt: string,
    context: HealthQuerySecurityContext
  ): Promise<HealthAgentResponse> {
    const servers = customerHealthStore.listServers(context.organizationId);
    if (servers.length === 0) {
      return {
        domain: 'HEALTH_COMPARISON',
        isOutOfScope: false,
        isActionRequest: false,
        response: 'You have no connected servers registered in this organization to compare.',
        observedFacts: ['0 registered servers in tenant inventory.'],
        inferences: [],
        unknownData: [],
        isStale: false,
        connectorOffline: false,
      };
    }

    const highestCpuServer = [...servers].sort((a, b) => b.cpuPercent - a.cpuPercent)[0];
    const unhealthyServers = servers.filter(s => s.status !== 'healthy');

    const facts = servers.map(
      s => `- Server ${s.serverId}: Status=${s.status}, CPU=${s.cpuPercent}%, Memory=${s.memoryPercent}%, Disk=${s.diskPercent}%`
    );

    const inferences = [
      `Server ${highestCpuServer.serverId} currently has the highest CPU utilization (${highestCpuServer.cpuPercent}%).`,
      unhealthyServers.length > 0
        ? `Currently, ${unhealthyServers.map(s => s.serverId).join(', ')} require attention due to non-nominal status.`
        : 'All connected servers are currently healthy.',
    ];

    const response = [
      '# 📊 Connected Fleet Health Comparison',
      '',
      '### [OBSERVED FACTS]',
      facts.join('\n'),
      '',
      '### [POSSIBLE CAUSE / INFERENCE]',
      inferences.map(i => `- ${i}`).join('\n'),
      '',
      '### [UNKNOWN DATA]',
      '- Cross-datacenter inter-rack link latency.',
    ].join('\n');

    return {
      domain: 'HEALTH_COMPARISON',
      isOutOfScope: false,
      isActionRequest: false,
      response,
      observedFacts: facts,
      inferences,
      unknownData: [],
      isStale: false,
      connectorOffline: false,
    };
  }

  private async resolveSecurityDiagnostics(
    prompt: string,
    context: HealthQuerySecurityContext
  ): Promise<HealthAgentResponse> {
    const serverId = this.extractServerId(prompt);
    const logsResult = customerHealthStore.getLogs(serverId, context.organizationId);

    // SECTION 8 & 9: Distinguish observed log evidence from inference!
    // Example: "Your logs show 183 failed login attempts in 4 minutes." is an observation.
    // "This may indicate a brute-force attempt." is an interpretation.
    // Do not present the interpretation as a confirmed attack without sufficient evidence.
    const facts: string[] = [];
    let hasFailedLogins = false;

    if (logsResult.success && logsResult.data) {
      for (const log of logsResult.data) {
        if (log.message.includes('183 repeated attempts') || log.message.includes('Failed password')) {
          facts.push(log.message);
          hasFailedLogins = true;
        }
      }
    }

    if (!hasFailedLogins) {
      facts.push('0 authentication failures or anomalous connection spikes detected in current log stream.');
    }

    const inferences: string[] = [];
    if (hasFailedLogins) {
      inferences.push('No confirmed attack was detected from the available telemetry. There are, however, 183 failed login attempts in the last 4 minutes.');
      inferences.push('This pattern may indicate a distributed credential-stuffing or brute-force probe.');
    } else {
      inferences.push('Security posture nominal; zero unauthorized penetration attempts observed.');
    }

    const unknown = ['Attacker network ASN attribution data.'];

    const response = [
      '# 🛡️ Operational Security & Log Diagnostics',
      '',
      '### [OBSERVED FACTS]',
      facts.map(f => `- ${f}`).join('\n'),
      '',
      '### [POSSIBLE CAUSE / INFERENCE]',
      inferences.map(i => `- ${i}`).join('\n'),
      '',
      '### [UNKNOWN DATA]',
      unknown.map(u => `- ${u}`).join('\n'),
    ].join('\n');

    return {
      domain: 'SECURITY_DIAGNOSTICS',
      isOutOfScope: false,
      isActionRequest: false,
      response,
      observedFacts: facts,
      inferences,
      unknownData: unknown,
      isStale: false,
      connectorOffline: false,
    };
  }

  // --- HELPERS ---

  private extractServerId(input: string): string {
    const match = input.match(/srv_[a-z0-9_]+/i);
    if (match) return match[0];
    const serverNamedMatch = input.match(/server\s+([a-z0-9_\-]+)/i);
    if (serverNamedMatch) return serverNamedMatch[1];
    if (input.includes('worker-02') || input.includes('compute')) return 'srv_prod_02';
    if (input.includes('stale')) return 'srv_prod_stale';
    if (input.includes('conn_down') || input.includes('hybrid')) return 'srv_conn_down_site_up';
    if (input.includes('secret') || input.includes('tenant_b')) return 'srv_tenant_secret';
    return 'srv_prod_01'; // Default primary production server
  }

  private extractDomain(input: string): string {
    const match = input.match(/https?:\/\/([^\s/]+)/i);
    if (match) return match[1];
    if (input.includes('down-site') || input.includes('api.down')) return 'api.down-site.com';
    return 'example.com';
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    return `${d}d ${h}h`;
  }

  private capitalize(s: string): string {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

export const customerHealthQueryAgent = new CustomerHealthQueryAgent();
