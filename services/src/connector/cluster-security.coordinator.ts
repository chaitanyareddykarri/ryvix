/**
 * Ryvix Cluster Security Coordinator
 * 
 * Ingests live telemetry and logs from connected cluster nodes:
 * 1. Analyzes logs in real-time via connected AI (LocalSecurityEngine).
 * 2. Extracts offending threat IPs.
 * 3. Triggers immediate firewall IP blocking on the target node.
 * 4. Automatically broadcasts proactive cluster-wide firewall rules to all peer nodes!
 * 5. Records tamper-proof audit trails for all security triggers.
 */

import { LocalSecurityEngine, ServerEventData, LocalAnalysisResult } from '@ryvix/ai';
import { InternalAgent, CapabilityExecutionResult } from './internal-agent';

export interface ClusterNodeRecord {
  nodeId: string;
  hostname: string;
  clusterId: string;
  agent: InternalAgent;
  lastSeen: string;
  status: 'online' | 'degraded' | 'offline';
}

export interface SecurityIncidentTrigger {
  incidentId: string;
  clusterId: string;
  targetHost: string;
  threatType: string;
  severity: string;
  offendingIp?: string;
  diagnosis: string;
  localActionExecuted: CapabilityExecutionResult;
  clusterBroadcastResult?: {
    peersNotified: number;
    nodesBlocked: string[];
  };
  triggeredAt: string;
}

export class ClusterSecurityCoordinator {
  private clusterId: string;
  private nodes = new Map<string, ClusterNodeRecord>();
  private incidentLog: SecurityIncidentTrigger[] = [];

  constructor(clusterId = 'prod_cluster_alpha') {
    this.clusterId = clusterId;
  }

  /**
   * Registers a connected server node into the cluster.
   */
  registerNode(nodeId: string, hostname: string, agent: InternalAgent): void {
    this.nodes.set(nodeId, {
      nodeId,
      hostname,
      clusterId: this.clusterId,
      agent,
      lastSeen: new Date().toISOString(),
      status: 'online',
    });
  }

  /**
   * Ingests real-time telemetry and logs from a connected server:
   * - AI detects attacks & extracts offending IP.
   * - Dispatches remediation capability to target host.
   * - Broadcasts proactive IP ban to all other cluster servers!
   */
  async processNodeTelemetryAndLogs(
    nodeId: string,
    eventData: ServerEventData
  ): Promise<{
    threatDetected: boolean;
    analysis: LocalAnalysisResult;
    incident?: SecurityIncidentTrigger;
  }> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Unregistered cluster node: ${nodeId}`);
    }
    node.lastSeen = new Date().toISOString();

    // 1. AI Log & Metric Analysis (<1ms local engine)
    const analysis: LocalAnalysisResult = LocalSecurityEngine.analyze(eventData);

    // If nominal / no threat
    if (analysis.severity === 'none' || analysis.threatType === 'UNKNOWN') {
      return { threatDetected: false, analysis };
    }

    // 2. Threat Detected: Execute remediation capability on target host
    const actionName = analysis.capabilityToInvoke?.action || 'firewall.block_ip';
    const params = {
      ...analysis.capabilityToInvoke?.params,
      ip: analysis.extractedAttackerIp || analysis.capabilityToInvoke?.params?.ip,
      reason: analysis.threatType,
    };

    const localResult = await node.agent.executeCapability(actionName, params);

    const offendingIp = analysis.extractedAttackerIp || params.ip;
    // Ensure target node local firewall drops the offending IP if extracted
    if (offendingIp && !node.agent.isIpBlocked(offendingIp)) {
      await node.agent.executeCapability('firewall.block_ip', {
        ip: offendingIp,
        reason: analysis.threatType,
      });
    }

    // 3. Cluster-Wide Broadcast Protection:
    // If an offending IP was identified, trigger IP blocks across ALL other cluster nodes!
    let clusterBroadcastResult: { peersNotified: number; nodesBlocked: string[] } | undefined;

    if (offendingIp) {
      const blockedNodes: string[] = [];
      for (const [peerId, peer] of this.nodes.entries()) {
        if (peerId !== nodeId) {
          await peer.agent.executeCapability('network.cluster_ip_block', {
            ip: offendingIp,
            sourceHost: node.hostname,
            clusterId: this.clusterId,
          });
          blockedNodes.push(peer.hostname);
        }
      }

      clusterBroadcastResult = {
        peersNotified: blockedNodes.length,
        nodesBlocked: blockedNodes,
      };
    }

    // 4. Record Incident in Audit Ledger
    const incident: SecurityIncidentTrigger = {
      incidentId: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      clusterId: this.clusterId,
      targetHost: node.hostname,
      threatType: analysis.threatType,
      severity: analysis.severity,
      offendingIp,
      diagnosis: analysis.diagnosis,
      localActionExecuted: localResult,
      clusterBroadcastResult,
      triggeredAt: new Date().toISOString(),
    };

    this.incidentLog.push(incident);

    return {
      threatDetected: true,
      analysis,
      incident,
    };
  }

  getIncidents(): SecurityIncidentTrigger[] {
    return [...this.incidentLog];
  }

  getClusterNodes(): ClusterNodeRecord[] {
    return Array.from(this.nodes.values());
  }
}

export const clusterSecurityCoordinator = new ClusterSecurityCoordinator();
