/** Native collection only. Remote actions require an authenticated backend dispatcher. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isAbsolute } from 'node:path';
export interface SystemMetrics {
  cpuUsagePercent: number;
  cpuCores: number;
  memoryTotalMb: number;
  memoryUsedMb: number;
  memoryUsagePercent: number;
  diskTotalGb: number;
  diskUsedGb: number;
  diskUsagePercent: number;
  loadAverage: [number, number, number];
}

export interface SystemdServiceState {
  name: string;
  status: 'active' | 'inactive' | 'failed' | 'restarting';
  subState: string;
}

export interface ContainerState {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'exited' | 'restarting';
}

export interface HostTelemetryPayload {
  serverId: string;
  hostname: string;
  timestamp: string;
  osType: string;
  kernelVersion: string;
  metrics: SystemMetrics;
  services: SystemdServiceState[];
  containers: ContainerState[];
  heartbeatSeq: number;
}

export interface CapabilityExecutionResult {
  command: string;
  success: boolean;
  message: string;
  executedAt: string;
  outputSummary?: string;
  bytesFreed?: number;
}


export class InternalAgent {
  constructor(private readonly serverId = '', private readonly hostname = '') {}

  async emitNativeTelemetry(): Promise<HostTelemetryPayload> {
    const binary = process.env.RYVIX_AGENT_BINARY;
    if (!this.serverId || !this.hostname || !binary || !isAbsolute(binary))
      throw new Error('A server identity and absolute native agent binary path are required');
    const { stdout } = await promisify(execFile)(binary,
      ['-server-id', this.serverId, '-hostname', this.hostname, '-once'],
      { timeout: 15000, maxBuffer: 262144, windowsHide: true });
    const value = JSON.parse(stdout) as HostTelemetryPayload;
    if (value.serverId !== this.serverId || value.hostname !== this.hostname ||
        !Number.isFinite(Date.parse(value.timestamp)) || Math.abs(Date.now() - Date.parse(value.timestamp)) > 120000 ||
        !value.metrics || !Array.isArray(value.services) || !Array.isArray(value.containers))
      throw new Error('Native agent returned invalid telemetry');
    for (const metric of ['cpuUsagePercent', 'memoryUsagePercent', 'diskUsagePercent'] as const) {
      if (!Number.isFinite(value.metrics[metric]) || value.metrics[metric] < 0 || value.metrics[metric] > 100)
        throw new Error('Native agent returned invalid measurements');
    }
    return value;
  }

  async executeCapability(_actionName: string, _params: Record<string, unknown>): Promise<CapabilityExecutionResult> {
    throw new Error('Remote capability execution requires an authenticated dispatcher and persisted approval');
  }
}
export const internalAgent = new InternalAgent();
