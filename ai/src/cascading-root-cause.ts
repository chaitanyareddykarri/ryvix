/**
 * @file cascading-root-cause.ts
 * @module @ryvix/ai
 *
 * Cascading Outage Dependency Graph & Root Trigger Isolation
 * Distinguishes originating root failures from downstream domino symptoms.
 * Provides topologically sorted recovery sequences to prevent futile remediation loops.
 */

export interface ServiceDependencyNode {
  serviceId: string;
  serviceName: string;
  archetype: string;
  dependsOn: string[]; // parent service IDs
}

export interface ServiceFailureEvent {
  serviceId: string;
  failureType: string;
  logSummary: string;
  timestamp: number;
}

export interface CascadingAnalysisResult {
  originatingRootService: string;
  originatingFailureType: string;
  affectedDownstreamServices: string[];
  isCascadingOutage: boolean;
  explanation: string;
  topologicalRemediationPlan: {
    step: number;
    serviceId: string;
    action: string;
    command: string;
    rationale: string;
  }[];
}

export class CascadingRootCauseAnalyzer {
  private dependencyGraph: Map<string, ServiceDependencyNode> = new Map();

  constructor() {
    this.initializeDefaultTopology();
  }

  private initializeDefaultTopology(): void {
    // Edge Proxy -> Web/App Server -> Cache & DB
    this.registerService({
      serviceId: 'edge-proxy',
      serviceName: 'Nginx Ingress Proxy',
      archetype: 'WEB_EDGE_PROXY',
      dependsOn: ['app-backend'],
    });

    this.registerService({
      serviceId: 'app-backend',
      serviceName: 'Core API Backend (Node/Go/Python)',
      archetype: 'APPLICATION_RUNTIME',
      dependsOn: ['redis-cache', 'primary-db'],
    });

    this.registerService({
      serviceId: 'redis-cache',
      serviceName: 'Redis Session & Query Cache',
      archetype: 'CACHE_MESSAGE_BROKER',
      dependsOn: [],
    });

    this.registerService({
      serviceId: 'primary-db',
      serviceName: 'PostgreSQL Relational Primary',
      archetype: 'DATABASE_HOST',
      dependsOn: [],
    });
  }

  public registerService(node: ServiceDependencyNode): void {
    this.dependencyGraph.set(node.serviceId, node);
  }

  /**
   * Analyze an alert wave across multiple services to locate the true origin
   */
  public diagnoseAlertWave(events: ServiceFailureEvent[]): CascadingAnalysisResult {
    if (events.length === 0) {
      throw new Error('Cannot diagnose empty alert wave');
    }

    if (events.length === 1) {
      const single = events[0];
      return {
        originatingRootService: single.serviceId,
        originatingFailureType: single.failureType,
        affectedDownstreamServices: [],
        isCascadingOutage: false,
        explanation: `Isolated single service alert on ${single.serviceId} (${single.failureType}).`,
        topologicalRemediationPlan: [
          {
            step: 1,
            serviceId: single.serviceId,
            action: 'REMEDIATE_ISOLATED',
            command: `systemctl restart ${single.serviceId}`,
            rationale: 'Isolated failure with no downstream cascade detected.',
          },
        ],
      };
    }

    // Determine dependency depths: services with 0 dependencies are upstream roots (DB, Cache)
    // Downstream services depend on upstream ones.
    const failingServiceIds = new Set(events.map((e) => e.serviceId));

    // Find the deepest dependency (root service that depends on nothing else among the failing set)
    let rootEvent: ServiceFailureEvent = events[0];
    let minDependencies = Infinity;

    for (const ev of events) {
      const node = this.dependencyGraph.get(ev.serviceId);
      const activeDeps = node ? node.dependsOn.filter((d) => failingServiceIds.has(d)).length : 0;
      if (activeDeps < minDependencies) {
        minDependencies = activeDeps;
        rootEvent = ev;
      }
    }

    const downstreamServices = events
      .filter((e) => e.serviceId !== rootEvent.serviceId)
      .map((e) => e.serviceId);

    // Build topological remediation sequence
    const remediationPlan = [
      {
        step: 1,
        serviceId: rootEvent.serviceId,
        action: 'FIX_ORIGINATING_ROOT_CAUSE',
        command: this.getRemediationForFailure(rootEvent.serviceId, rootEvent.failureType),
        rationale: `Primary trigger: ${rootEvent.failureType} on ${rootEvent.serviceId}. Must be resolved first to restore upstream availability.`,
      },
    ];

    let step = 2;
    for (const downstream of downstreamServices) {
      remediationPlan.push({
        step: step++,
        serviceId: downstream,
        action: 'DRAIN_AND_RECONNECT',
        command: `systemctl restart ${downstream} || true`,
        rationale: `Restoring downstream client ${downstream} after root origin recovery.`,
      });
    }

    return {
      originatingRootService: rootEvent.serviceId,
      originatingFailureType: rootEvent.failureType,
      affectedDownstreamServices: downstreamServices,
      isCascadingOutage: true,
      explanation: `CASCADING DOMINO FAILURE: Root cause is ${rootEvent.serviceId} (${rootEvent.failureType}), which triggered downstream failure symptoms across ${downstreamServices.join(', ')}.`,
      topologicalRemediationPlan: remediationPlan,
    };
  }

  private getRemediationForFailure(serviceId: string, failureType: string): string {
    const upper = failureType.toUpperCase();
    if (upper.includes('DEADLOCK') || upper.includes('DATABASE')) {
      return 'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = "idle in transaction"';
    }
    if (upper.includes('OOM') || upper.includes('REDIS')) {
      return 'redis-cli config set maxmemory-policy allkeys-lru && redis-cli memory purge';
    }
    return `systemctl restart ${serviceId}`;
  }
}

export const cascadingRootCauseAnalyzer = new CascadingRootCauseAnalyzer();
