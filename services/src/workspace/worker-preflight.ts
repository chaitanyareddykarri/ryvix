import { runDocker, type DockerRunner } from './docker-workspace.manager';
import {staticWorkspaceMode} from './static-policy';

/** Read-only checks before the worker may acquire a job lease. */
export async function verifyWorkerDocker(env: NodeJS.ProcessEnv = process.env, run: DockerRunner = runDocker) {
  const approved = (env.RYVIX_WORKSPACE_IMAGES || '').split(',').filter(Boolean);
  const images = staticWorkspaceMode(env) ? ['RYVIX_WORKSPACE_STATIC_IMAGE','RYVIX_PREVIEW_RELAY_IMAGE'] : ['RYVIX_WORKSPACE_NODE_IMAGE', 'RYVIX_WORKSPACE_EGRESS_IMAGE'];
  for (const name of images) {
    if (!env[name] || !approved.includes(env[name]!)) {
      throw new Error(`${name} must be configured in RYVIX_WORKSPACE_IMAGES`);
    }
  }
  const info = await run(['info', '--format', '{{.OSType}}'], 10000);
  if (info.exitCode !== 0 || info.timedOut || info.stdout.trim() !== 'linux') {
    throw new Error('A reachable Linux Docker engine is required');
  }
  for (const name of images) {
    const result = await run(['image', 'inspect', '--format', '{{.Os}}', env[name]!], 10000);
    if (result.exitCode !== 0 || result.timedOut || result.stdout.trim() !== 'linux') {
      throw new Error(`${name} must be installed as a Linux image on the worker`);
    }
  }
}
