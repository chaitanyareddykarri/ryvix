import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export async function deploy({ env = process.env, request = fetch, run = (args, vars) =>
  execFileSync('docker', args, { env: vars, encoding: 'utf8', timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'] }).trim() } = {}) {
  if (!/^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+:[a-f0-9]{40}$/.test(env.RYVIX_IMAGE || '')) throw new Error('An immutable GHCR image tag is required');
  if (!/^[a-f0-9]{40}$/.test(env.RYVIX_RELEASE_SHA || '') || !env.RYVIX_IMAGE.endsWith(`:${env.RYVIX_RELEASE_SHA}`)) throw new Error('Image and release revision must match');
  if (!env.RYVIX_RUNTIME_ENV_FILE || !path.isAbsolute(env.RYVIX_RUNTIME_ENV_FILE)) throw new Error('Absolute runtime environment file path required');
  const health = new URL(env.RYVIX_HEALTH_URL || '');
  if (health.protocol !== 'https:' && !(health.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(health.hostname))) throw new Error('Use HTTPS for remote health verification');
  if (health.username || health.password) throw new Error('Health URL must not contain credentials');
  const compose = ['compose', '--project-name', 'ryvix', '--file', 'infrastructure/compose.production.yml'];
  const container = run([...compose, 'ps', '-q', 'web'], env);
  let previousImage = '', previousRevision = '';
  if (container) {
    previousImage = run(['inspect', '--format', '{{.Config.Image}}', container], env);
    previousRevision = run(['inspect', '--format', '{{index .Config.Labels "com.ryvix.revision"}}', container], env);
    if (!previousImage || !/^[a-f0-9]{40}$/.test(previousRevision)) throw new Error('Existing release lacks rollback metadata');
  }
  // Pull failure leaves the running release untouched.
  run([...compose, 'pull', 'web'], env);
  const verify = async revision => {
    const response = await request(health, { signal: AbortSignal.timeout(15000), redirect: 'error', cache: 'no-store' });
    if (!response.ok) throw new Error('Release health endpoint failed');
    const body = await response.json();
    if (body.status !== 'ok' || body.revision !== revision) throw new Error('Health response did not match the deployed revision');
  };
  try {
    run([...compose, 'up', '-d', '--wait', '--wait-timeout', '180', 'web'], env);
    await verify(env.RYVIX_RELEASE_SHA);
    return { deployed: true, revision: env.RYVIX_RELEASE_SHA };
  } catch {
    if (previousImage) {
      try {
        const rollback = { ...env, RYVIX_IMAGE: previousImage, RYVIX_RELEASE_SHA: previousRevision };
        run([...compose, 'up', '-d', '--wait', '--wait-timeout', '180', 'web'], rollback);
        await verify(previousRevision);
      } catch { throw new Error('Deployment and rollback verification failed; operator intervention required'); }
      throw new Error('Deployment failed; previous revision restored and verified');
    }
    run([...compose, 'stop', 'web'], env);
    throw new Error('Initial deployment failed; unhealthy service stopped');
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deploy().then(result => console.log(JSON.stringify(result))).catch(error => {
    // Never print docker command environments or unfiltered stderr containing configuration.
    console.error(error instanceof Error && !('stderr' in error) ? error.message : 'Docker deployment command failed');
    process.exitCode = 1;
  });
}
