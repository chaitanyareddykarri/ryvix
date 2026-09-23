/**
 * @file graph-rag.ts
 * @module @ryvix/ai
 *
 * GraphRAG & System Topology Knowledge Graph Engine
 * 
 * Maps interconnected infrastructure entities into a directed multi-relational graph:
 * - Nodes: Servers, Services, Ports, Databases, Reverse Proxies, Containers, API Routes
 * - Edges: LISTENS_ON, REVERSE_PROXIES, CONNECTS_TO, DEPENDS_ON, HOSTED_ON, CONTAINED_IN
 * - Provides:
 *   1. Spatial Blast Radius Traversal: pinpoint exactly what cascades if a service fails
 *   2. Dependency Chain BFS: pathfinding from public endpoint to root dependency
 *   3. Context Augmentation: injects structured topological relationships into LLM prompts
 */

export type TopologyNodeType = 
  | 'SERVER'
  | 'SERVICE'
  | 'PORT'
  | 'DATABASE'
  | 'REVERSE_PROXY'
  | 'CONTAINER'
  | 'API_ROUTE';

export type TopologyRelationType = 
  | 'LISTENS_ON'
  | 'REVERSE_PROXIES'
  | 'CONNECTS_TO'
  | 'DEPENDS_ON'
  | 'HOSTED_ON'
  | 'CONTAINED_IN';

export interface TopologyNode {
  id: string;
  name: string;
  type: TopologyNodeType;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  metadata?: Record<string, any>;
}

export interface TopologyEdge {
  source: string;
  target: string;
  relation: TopologyRelationType;
  metadata?: Record<string, any>;
}

export interface BlastRadiusResult {
  rootNodeId: string;
  impactedNodes: TopologyNode[];
  impactPaths: string[];
  maxDepthReached: number;
  criticalServiceCount: number;
}

export class SystemTopologyGraph {
  private nodes = new Map<string, TopologyNode>();
  private edges: TopologyEdge[] = [];

  constructor() {
    this.seedProductionTopology();
  }

  public addNode(node: TopologyNode): void {
    this.nodes.set(node.id, node);
  }

  public addEdge(edge: TopologyEdge): void {
    // Avoid duplicate edges
    const exists = this.edges.some(
      (e) => e.source === edge.source && e.target === edge.target && e.relation === edge.relation
    );
    if (!exists) {
      this.edges.push(edge);
    }
  }

  public getNode(id: string): TopologyNode | undefined {
    return this.nodes.get(id);
  }

  public getOutboundEdges(nodeId: string): TopologyEdge[] {
    return this.edges.filter((e) => e.source === nodeId);
  }

  public getInboundEdges(nodeId: string): TopologyEdge[] {
    return this.edges.filter((e) => e.target === nodeId);
  }

  /**
   * Traverses outbound and dependent edges to calculate exact cascade impact
   */
  public getBlastRadius(rootNodeId: string, maxDepth: number = 3): BlastRadiusResult {
    const visited = new Set<string>();
    const impacted: TopologyNode[] = [];
    const impactPaths: string[] = [];
    let criticalCount = 0;

    const queue: Array<{ nodeId: string; depth: number; path: string }> = [
      { nodeId: rootNodeId, depth: 0, path: rootNodeId }
    ];
    visited.add(rootNodeId);

    let maxDepthReached = 0;

    while (queue.length > 0) {
      const { nodeId, depth, path } = queue.shift()!;
      maxDepthReached = Math.max(maxDepthReached, depth);

      // Find all nodes that depend on or reverse-proxy this node
      // E.g. If node-app fails, Nginx (which reverse-proxies it) is impacted.
      // If PostgreSQL fails, node-app (which connects to it) is impacted.
      const dependents = this.edges.filter(
        (e) => (e.target === nodeId || e.source === nodeId) &&
               (e.relation === 'DEPENDS_ON' || e.relation === 'CONNECTS_TO' || e.relation === 'REVERSE_PROXIES')
      );

      for (const edge of dependents) {
        const otherId = edge.source === nodeId ? edge.target : edge.source;
        if (!visited.has(otherId) && depth < maxDepth) {
          visited.add(otherId);
          const otherNode = this.nodes.get(otherId);
          if (otherNode) {
            impacted.push(otherNode);
            if (otherNode.type === 'REVERSE_PROXY' || otherNode.type === 'DATABASE' || otherNode.type === 'SERVICE') {
              criticalCount++;
            }
          }
          const nextPath = `${path} -> (${edge.relation}) -> ${otherId}`;
          impactPaths.push(nextPath);
          queue.push({ nodeId: otherId, depth: depth + 1, path: nextPath });
        }
      }
    }

    return {
      rootNodeId,
      impactedNodes: impacted,
      impactPaths,
      maxDepthReached,
      criticalServiceCount: criticalCount
    };
  }

  /**
   * BFS pathfinding from source node to target node
   */
  public findDependencyChain(fromId: string, toId: string): string[] | null {
    if (fromId === toId) return [fromId];

    const visited = new Set<string>();
    const queue: Array<{ current: string; path: string[] }> = [{ current: fromId, path: [fromId] }];
    visited.add(fromId);

    while (queue.length > 0) {
      const { current, path } = queue.shift()!;
      const nextEdges = this.edges.filter((e) => e.source === current);

      for (const edge of nextEdges) {
        if (edge.target === toId) {
          return [...path, edge.target];
        }
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ current: edge.target, path: [...path, edge.target] });
        }
      }
    }

    return null;
  }

  /**
   * Seeds realistic production infrastructure topology
   */
  public seedProductionTopology(): void {
    // 1. Host Server
    this.addNode({
      id: 'srv_prod_01',
      name: 'app-prod-worker-01 (AWS us-east-1)',
      type: 'SERVER',
      status: 'HEALTHY',
      metadata: { ip: '10.0.1.15', provider: 'aws', vcpu: 4, ramGb: 8 }
    });

    // 2. Reverse Proxy Nginx
    this.addNode({
      id: 'svc_nginx',
      name: 'Nginx Edge Reverse Proxy',
      type: 'REVERSE_PROXY',
      status: 'HEALTHY'
    });

    // 3. Sockets
    this.addNode({ id: 'port_80', name: 'TCP Port 80 (HTTP)', type: 'PORT', status: 'HEALTHY' });
    this.addNode({ id: 'port_443', name: 'TCP Port 443 (HTTPS)', type: 'PORT', status: 'HEALTHY' });
    this.addNode({ id: 'port_3000', name: 'TCP Port 3000 (Node Backend)', type: 'PORT', status: 'HEALTHY' });
    this.addNode({ id: 'port_5432', name: 'TCP Port 5432 (PostgreSQL)', type: 'PORT', status: 'HEALTHY' });

    // 4. Backend Service
    this.addNode({
      id: 'svc_node_backend',
      name: 'Node.js Next.js Application Backend',
      type: 'SERVICE',
      status: 'HEALTHY',
      metadata: { pid: 4128, entry: 'web/server.js' }
    });

    // 5. Database
    this.addNode({
      id: 'db_postgres',
      name: 'PostgreSQL 17 Primary Database',
      type: 'DATABASE',
      status: 'HEALTHY',
      metadata: { maxConnections: 100, activeConnections: 18 }
    });

    // 6. API Route
    this.addNode({
      id: 'route_chat_api',
      name: 'Next.js App Router /api/chat',
      type: 'API_ROUTE',
      status: 'HEALTHY'
    });

    // Connect Relationships
    this.addEdge({ source: 'svc_nginx', target: 'srv_prod_01', relation: 'HOSTED_ON' });
    this.addEdge({ source: 'svc_node_backend', target: 'srv_prod_01', relation: 'HOSTED_ON' });
    this.addEdge({ source: 'db_postgres', target: 'srv_prod_01', relation: 'HOSTED_ON' });

    this.addEdge({ source: 'svc_nginx', target: 'port_80', relation: 'LISTENS_ON' });
    this.addEdge({ source: 'svc_nginx', target: 'port_443', relation: 'LISTENS_ON' });
    this.addEdge({ source: 'svc_node_backend', target: 'port_3000', relation: 'LISTENS_ON' });
    this.addEdge({ source: 'db_postgres', target: 'port_5432', relation: 'LISTENS_ON' });

    this.addEdge({ source: 'svc_nginx', target: 'svc_node_backend', relation: 'REVERSE_PROXIES' });
    this.addEdge({ source: 'svc_node_backend', target: 'db_postgres', relation: 'CONNECTS_TO' });
    this.addEdge({ source: 'route_chat_api', target: 'svc_node_backend', relation: 'DEPENDS_ON' });
  }

  /**
   * Formats relevant graph context for LLM prompt injection
   */
  public formatTopologyContext(focusId?: string): string {
    const focusNode = focusId ? this.nodes.get(focusId) : undefined;
    const lines: string[] = ['[SYSTEM TOPOLOGY KNOWLEDGE GRAPH (GraphRAG)]'];

    if (focusNode) {
      const blast = this.getBlastRadius(focusNode.id);
      lines.push(`Target Entity: ${focusNode.name} (${focusNode.type}) - Status: ${focusNode.status}`);
      lines.push(`Cascading Blast Radius (${blast.impactedNodes.length} nodes impacted):`);
      for (const node of blast.impactedNodes) {
        lines.push(`  - Impacted: ${node.name} [${node.type}]`);
      }
      if (blast.impactPaths.length > 0) {
        lines.push('Dependency Propagation Vectors:');
        for (const p of blast.impactPaths.slice(0, 4)) {
          lines.push(`  * ${p}`);
        }
      }
    } else {
      lines.push(`Active Infrastructure Nodes: ${this.nodes.size} | Relational Edges: ${this.edges.length}`);
      for (const n of Array.from(this.nodes.values()).slice(0, 6)) {
        lines.push(`  - [${n.type}] ${n.name}`);
      }
    }

    return lines.join('\n');
  }

  public getStats(): { nodesCount: number; edgesCount: number } {
    return {
      nodesCount: this.nodes.size,
      edgesCount: this.edges.length
    };
  }
}

export const systemTopologyGraph = new SystemTopologyGraph();
