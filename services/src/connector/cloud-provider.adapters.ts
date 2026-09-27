import { EC2Client, DescribeInstanceStatusCommand, RebootInstancesCommand, StartInstancesCommand, StopInstancesCommand } from '@aws-sdk/client-ec2';
import type { HypervisorProbeResult, CloudPowerActionResult, SupportedCloudProvider } from './cloud-recovery.bridge';

export type PowerAction = CloudPowerActionResult['action'];
export interface CloudProviderAdapter {
  probe(instanceId: string): Promise<HypervisorProbeResult>;
  execute(instanceId: string, action: PowerAction): Promise<{ id: string; status: CloudPowerActionResult['status'] }>;
}
export class AwsRecoveryAdapter implements CloudProviderAdapter {
  constructor(private readonly client: Pick<EC2Client, 'send'>) {}
  private validate(id: string) { if (!/^i-[a-f0-9]{8,17}$/.test(id)) throw new Error('Invalid EC2 instance ID'); }
  async probe(instanceId: string): Promise<HypervisorProbeResult> {
    this.validate(instanceId);
    const result = await this.client.send(new DescribeInstanceStatusCommand({ InstanceIds: [instanceId], IncludeAllInstances: true }), { abortSignal: AbortSignal.timeout(30000) });
    const item = result.InstanceStatuses?.[0];
    if (!item) throw new Error('EC2 instance was not returned');
    const check = (value?: string) => value === 'ok' ? 'ok' as const : value === 'impaired' ? 'impaired' as const : 'insufficient_data' as const;
    const state = item.InstanceState?.Name;
    return { provider: 'aws', instanceId, state: state === 'running' || state === 'stopped' || state === 'terminated' ? state : 'unknown',
      hypervisorResponsive: item.SystemStatus?.Status === 'ok',
      statusChecks: { systemCheck: check(item.SystemStatus?.Status), instanceCheck: check(item.InstanceStatus?.Status) }, checkedAt: new Date().toISOString() };
  }
  async execute(id: string, action: PowerAction) {
    this.validate(id);
    // EC2 RebootInstances performs a hard reboot if a graceful restart fails.
    const command = action === 'power_on' ? new StartInstancesCommand({ InstanceIds: [id] })
      : action === 'power_off' ? new StopInstancesCommand({ InstanceIds: [id] })
      : new RebootInstancesCommand({ InstanceIds: [id] });
    const result = await this.client.send(command, { abortSignal: AbortSignal.timeout(30000) });
    if (!result.$metadata.requestId) throw new Error('EC2 did not return a request ID');
    return { id: result.$metadata.requestId, status: 'dispatched' as const };
  }
}

export class RestRecoveryAdapter implements CloudProviderAdapter {
  constructor(private readonly provider: 'digitalocean' | 'hetzner' | 'gcp',
    private readonly token: () => Promise<string>, private readonly request: typeof fetch = fetch) {}
  private resource(id: string) {
    if (this.provider === 'gcp') {
      if (!/^projects\/[a-z][a-z0-9-]+\/zones\/[a-z0-9-]+\/instances\/[a-z][a-z0-9-]*$/.test(id)) throw new Error('Use the full GCP instance resource path');
      return `https://compute.googleapis.com/compute/v1/${id}`;
    }
    if (!/^[1-9][0-9]*$/.test(id)) throw new Error('Invalid cloud server ID');
    return this.provider === 'digitalocean' ? `https://api.digitalocean.com/v2/droplets/${id}` : `https://api.hetzner.cloud/v1/servers/${id}`;
  }
  private async api(url: string, method = 'GET', body?: unknown) {
    const token = await this.token();
    if (!token) throw new Error(`${this.provider} credentials are not configured`);
    let response: Response;
    try {
      response = await this.request(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000), redirect: 'error' });
    } catch { throw new Error(`${this.provider} API unavailable or timed out`); }
    if (!response.ok) throw new Error(`${this.provider} API HTTP ${response.status}`);
    return response.json();
  }
  async probe(instanceId: string): Promise<HypervisorProbeResult> {
    const body = await this.api(this.resource(instanceId));
    const raw = this.provider === 'digitalocean' ? body.droplet?.status : this.provider === 'hetzner' ? body.server?.status : body.status;
    if (typeof raw !== 'string') throw new Error('Provider returned an invalid server status');
    const state = ['active', 'running', 'RUNNING'].includes(raw) ? 'running'
      : ['off', 'TERMINATED', 'SUSPENDED'].includes(raw) ? 'stopped' : 'unknown';
    // Power state does not establish guest health or hypervisor health.
    return { provider: this.provider, instanceId, state, hypervisorResponsive: true,
      statusChecks: { systemCheck: 'insufficient_data', instanceCheck: 'insufficient_data' }, checkedAt: new Date().toISOString() };
  }
  async execute(id: string, action: PowerAction) {
    const resource = this.resource(id);
    const actions = this.provider === 'digitalocean'
      ? { reboot: 'reboot', hard_reset: 'power_cycle', power_off: 'shutdown', power_on: 'power_on' }
      : this.provider === 'hetzner'
      ? { reboot: 'reboot', hard_reset: 'reset', power_off: 'shutdown', power_on: 'poweron' }
      : { reboot: 'reset', hard_reset: 'reset', power_off: 'stop', power_on: 'start' };
    const result = await this.api(this.provider === 'digitalocean' ? `${resource}/actions`
      : this.provider === 'hetzner' ? `${resource}/actions/${actions[action]}` : `${resource}/${actions[action]}`, 'POST',
      this.provider === 'digitalocean' ? { type: actions[action] } : {});
    const operation = this.provider === 'gcp' ? result : result.action;
    if (!operation || (!operation.id && !operation.name)) throw new Error('Provider did not return an action ID');
    const failed = operation.error || ['errored', 'error'].includes(operation.status);
    if (failed) throw new Error(`${this.provider} rejected the power action`);
    const status = ['completed', 'success', 'DONE'].includes(operation.status) ? 'completed' as const : 'dispatched' as const;
    return { id: String(operation.id || operation.name), status };
  }
}

/** Worker credentials only; callers must resolve tenant ownership before using an adapter. */
export function configuredCloudAdapters(): Partial<Record<SupportedCloudProvider, CloudProviderAdapter>> {
  const adapters: Partial<Record<SupportedCloudProvider, CloudProviderAdapter>> = {};
  if (process.env.AWS_REGION) adapters.aws = new AwsRecoveryAdapter(new EC2Client({ region: process.env.AWS_REGION, maxAttempts: 1 }));
  if (process.env.DIGITALOCEAN_TOKEN) adapters.digitalocean = new RestRecoveryAdapter('digitalocean', async () => process.env.DIGITALOCEAN_TOKEN!);
  if (process.env.HETZNER_TOKEN) adapters.hetzner = new RestRecoveryAdapter('hetzner', async () => process.env.HETZNER_TOKEN!);
  if (process.env.GCP_ACCESS_TOKEN) adapters.gcp = new RestRecoveryAdapter('gcp', async () => process.env.GCP_ACCESS_TOKEN!);
  return adapters;
}
