import type { DockerRunner } from './docker-workspace.manager';
import {staticWorkspaceMode} from './static-policy';

/** Inventory, including retained previews, is authoritative across worker restarts. */
export async function workspaceCapacity(run: DockerRunner, cpu = 1, ramMb = 2048, env = process.env): Promise<boolean> {
  const small = staticWorkspaceMode(env);
  if (!env.RYVIX_WORKSPACE_MAX_SESSIONS) { if(small)throw new Error('Static workspace host budget required'); return true; }
  const max = Number(env.RYVIX_WORKSPACE_MAX_SESSIONS);
  const memory = Number(env.RYVIX_WORKSPACE_MEMORY_BUDGET_MB);
  const cores = Number(env.RYVIX_WORKSPACE_CPU_BUDGET);
  if (!Number.isInteger(max) || max < 1 || max > (small ? 1 : 20) || !Number.isInteger(memory) || memory < (small ? 320 : 2304) ||
      (small && memory > 384) || !Number.isFinite(cores) || cores < (small ? 0.75 : 2)) throw new Error('Invalid workspace host budget');
  const sideCpu = small ? 0.5 : 1, sideMemory = small ? 128 : 256;
  const ids = await run(['ps','-aq','--filter','label=ryvix.workspace=true'],10000);
  if (ids.exitCode || ids.timedOut) throw new Error('Workspace inventory unavailable');
  const names = ids.stdout.trim().split(/\s+/).filter(Boolean);
  if (!names.length) return cpu + sideCpu <= cores && ramMb + sideMemory <= memory;
  if (names.some(id => !/^[a-f0-9]{12,64}$/.test(id))) throw new Error('Invalid workspace inventory');
  const inspected = await run(['inspect',...names],10000);
  if (inspected.exitCode || inspected.timedOut) throw new Error('Workspace inventory unavailable');
  const containers = JSON.parse(inspected.stdout);
  if (!Array.isArray(containers) || containers.length !== names.length) throw new Error('Incomplete workspace inventory');
  let count = 0, usedCpu = 0, usedMemory = 0;
  const sessions = new Set<string>();
  for (const c of containers) {
    const labels = c.Config?.Labels;
    if (labels?.['ryvix.workspace'] !== 'true' || !labels['ryvix.session']) throw new Error('Unknown workspace allocation');
    // Reserve both sidecars even when temporarily absent. Orphan sidecars fail closed below.
    if (labels['ryvix.role']) {
      if (small && labels['ryvix.role'] !== 'preview-relay') throw new Error('Static host has an unexpected sidecar');
      if (!(c.HostConfig?.Memory > 0 && c.HostConfig.Memory <= 128*1048576 && c.HostConfig.NanoCpus > 0 && c.HostConfig.NanoCpus <= 0.5e9)) throw new Error('Unbounded workspace sidecar');
      continue;
    }
    const cpus = Number(c.HostConfig?.NanoCpus) / 1e9;
    const mb = Number(c.HostConfig?.Memory) / 1048576;
    if (!(cpus > 0) || !(mb > 0) || sessions.has(labels['ryvix.session'])) throw new Error('Unbounded workspace allocation');
    sessions.add(labels['ryvix.session']);count++;usedCpu += cpus + sideCpu;usedMemory += mb + sideMemory;
  }
  for (const c of containers) {
    const labels = c.Config.Labels;
    if (!sessions.has(labels['ryvix.session']) || (labels['ryvix.role'] && !['egress-broker','preview-relay'].includes(labels['ryvix.role'])))
      throw new Error('Orphan workspace allocation requires cleanup');
  }
  return count < max && usedCpu + cpu + sideCpu <= cores && usedMemory + ramMb + sideMemory <= memory;
}
