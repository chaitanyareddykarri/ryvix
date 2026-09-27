/**
 * Ryvix Out-of-Band Cloud Recovery Bridge
 * 
 * Interacts directly with cloud hypervisor APIs (AWS EC2, DigitalOcean, Hetzner, GCP)
 * completely independent of the customer's guest OS or in-host agent.
 * 
 * Provides:
 * - Hypervisor health & reachability probes
 * - Out-of-band ACPI shutdown & hard power cycles
 * - Differential diagnosis: distinguishing between daemon freeze vs kernel panic vs cloud outage
 */

import { requireAuthorization, type OperationAuthorization } from '../../../backend/src/services/operation-authorization';
import { configuredCloudAdapters, type CloudProviderAdapter, type PowerAction } from './cloud-provider.adapters';

export type SupportedCloudProvider = 'aws' | 'digitalocean' | 'hetzner' | 'gcp' | 'baremetal';

export interface HypervisorProbeResult {
  provider: SupportedCloudProvider;
  instanceId: string;
  state: 'running' | 'stopped' | 'crashed' | 'terminated' | 'unknown';
  hypervisorResponsive: boolean;
  statusChecks: {
    systemCheck: 'ok' | 'impaired' | 'insufficient_data';
    instanceCheck: 'ok' | 'impaired' | 'insufficient_data';
  };
  checkedAt: string;
}

export interface CloudPowerActionResult {
  actionId: string;
  provider: SupportedCloudProvider;
  instanceId: string;
  action: 'reboot' | 'hard_reset' | 'power_off' | 'power_on';
  status: 'dispatched' | 'completed' | 'failed';
  providerMessage: string;
  executedAt: string;
}

export interface DifferentialDiagnosisResult {
  diagnosis: 'HEALTHY' | 'DAEMON_CRASH' | 'KERNEL_PANIC_OOM' | 'HYPERVISOR_OUTAGE' | 'UNKNOWN';
  confidence: number;
  recommendation: 'NONE' | 'RESTART_DAEMON' | 'OUT_OF_BAND_HARD_RESET' | 'CONTACT_CLOUD_PROVIDER';
  explanation: string;
}

export class CloudRecoveryBridge {
  constructor(private readonly adapters: Partial<Record<SupportedCloudProvider, CloudProviderAdapter>> = configuredCloudAdapters()) {}
  private adapter(provider: SupportedCloudProvider) {
    const adapter = this.adapters[provider];
    if (!adapter) throw new Error('Cloud provider is not configured or supported');
    return adapter;
  }
  async probeHypervisor(provider: SupportedCloudProvider, instanceId: string): Promise<HypervisorProbeResult> {
    return this.adapter(provider).probe(instanceId);
  }
  async executePowerAction(provider: SupportedCloudProvider, instanceId: string, action: PowerAction,
    authorization?: OperationAuthorization): Promise<CloudPowerActionResult> {
    requireAuthorization(authorization);
    if (!['reboot', 'hard_reset', 'power_off', 'power_on'].includes(action)) throw new Error('Unsupported power action');
    const adapter = this.adapter(provider);
    const target = provider + ':' + instanceId;
    await authorization.recordAudit({ action: 'cloud.' + action, target, status: 'requested' });
    try {
      const operation = await adapter.execute(instanceId, action);
      if (!operation.id || !['dispatched', 'completed'].includes(operation.status)) throw new Error('Provider action failed');
      await authorization.recordAudit({ action: 'cloud.' + action, target, status: 'success', detail: operation.status + ':' + operation.id });
      return { actionId: operation.id, provider, instanceId, action, status: operation.status,
        providerMessage: 'Provider action ' + operation.status + '; verify instance health separately', executedAt: new Date().toISOString() };
    } catch (error) {
      await authorization.recordAudit({ action: 'cloud.' + action, target, status: 'failure', detail: 'Provider action failed or outcome unknown' });
      throw new Error('Cloud power action failed or timed out; verify provider state before retrying');
    }
  }
  diagnoseFailure(
    lastHeartbeatSecondsAgo: number,
    hypervisorProbe: HypervisorProbeResult
  ): DifferentialDiagnosisResult {
    // 1. If internal daemon is active (<30s heartbeat), server is healthy
    if (lastHeartbeatSecondsAgo < 30 && hypervisorProbe.state === 'running' && hypervisorProbe.statusChecks.instanceCheck === 'ok') {
      return {
        diagnosis: 'HEALTHY',
        confidence: 0.99,
        recommendation: 'NONE',
        explanation: 'Internal connector streaming regular heartbeats; hypervisor checks nominal.',
      };
    }

    // 2. Internal daemon is silent (>30s)
    if (!hypervisorProbe.hypervisorResponsive || hypervisorProbe.statusChecks.systemCheck === 'impaired') {
      return {
        diagnosis: 'HYPERVISOR_OUTAGE',
        confidence: 0.95,
        recommendation: 'CONTACT_CLOUD_PROVIDER',
        explanation: 'Underlying cloud host hypervisor is unresponsive or impaired. Host hardware or network failure at provider.',
      };
    }

    if (hypervisorProbe.statusChecks.instanceCheck === 'impaired') {
      return {
        diagnosis: 'KERNEL_PANIC_OOM',
        confidence: 0.92,
        recommendation: 'OUT_OF_BAND_HARD_RESET',
        explanation: 'Host VM is powered on but guest OS is frozen (kernel panic or OOM deadlock). Out-of-band reboot required.',
      };
    }

    if (hypervisorProbe.statusChecks.instanceCheck === 'insufficient_data' || hypervisorProbe.state !== 'running') {
      return { diagnosis: 'UNKNOWN', confidence: 0, recommendation: 'NONE', explanation: 'Insufficient provider health evidence; investigate before recovery.' };
    }
    return {
      diagnosis: 'DAEMON_CRASH',
      confidence: 0.85,
      recommendation: 'RESTART_DAEMON',
      explanation: 'Server instance is reachable but Ryvix internal agent stopped responding. Process crash suspected.',
    };
  }
}

export const cloudRecoveryBridge = new CloudRecoveryBridge();
