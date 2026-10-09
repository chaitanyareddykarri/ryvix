import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export async function deploy({ env = process.env, request = fetch, run = (args, vars) =>
  execFileSync('docker', args, { env: vars, encoding: 'utf8', timeout: 1200000, stdio: ['ignore', 'pipe', 'pipe'] }).trim() } = {}) {
  if (!/^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+:[a-f0-9]{40}$/.test(env.RYVIX_IMAGE || '')) throw new Error('An immutable GHCR image tag is required');
  if (!/^[a-f0-9]{40}$/.test(env.RYVIX_RELEASE_SHA || '') || !env.RYVIX_IMAGE.endsWith(`:${env.RYVIX_RELEASE_SHA}`)) throw new Error('Image and release revision must match');
  if (!env.RYVIX_RUNTIME_ENV_FILE || !path.isAbsolute(env.RYVIX_RUNTIME_ENV_FILE)) throw new Error('Absolute runtime environment file path required');
  const health = new URL(env.RYVIX_HEALTH_URL || '');
  if (health.protocol !== 'https:' && !(health.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(health.hostname))) throw new Error('Use HTTPS for remote health verification');
  if (health.username || health.password) throw new Error('Health URL must not contain credentials');
  const workers = (env.RYVIX_DEPLOY_WORKERS || '').split(',').filter(Boolean);
  if (new Set(workers).size !== workers.length || workers.some(w => !['workspace','operations','gmail','whatsapp','experience'].includes(w))) throw new Error('Invalid worker selection');
  const activeRoles = run(['ps','--filter','label=com.docker.compose.project=ryvix','--format','{{.Label "com.docker.compose.service"}}'],env).split(/\s+/);
  if (activeRoles.some(role => ['workspace','operations','gmail','whatsapp','experience'].includes(role) && !workers.includes(role)))
    throw new Error('Include every running Compose worker in the release, or stop removed roles first');
  if (workers.length && (!path.isAbsolute(env.RYVIX_WORKER_ENV_DIR || '') || !/^\d+$/.test(env.RYVIX_DOCKER_GID || ''))) throw new Error('Worker environment directory and Docker group required');
  env = {...env, RYVIX_WORKER_IMAGE: env.RYVIX_IMAGE.replace(/:([a-f0-9]{40})$/, '-workers:$1')};
  const compose = ['compose', '--project-name', 'ryvix', '--file', 'infrastructure/compose.production.yml',
    ...(workers.length ? ['--file','infrastructure/compose.workers.yml',...workers.flatMap(w=>['--profile',w])] : [])];
  const services = ['web',...workers];
  if (workers.length) for (const role of ['workspace','operations','gmail','whatsapp','experience']) {
    if (!workers.includes(role) && run([...compose,'ps','-q',role],env)) throw new Error('Include every running Compose worker in the release, or stop removed roles first');
  }
  const container = run([...compose, 'ps', '-q', 'web'], env);
  let previousImage = '', previousRevision = '';
  if (container) {
    previousImage = run(['inspect', '--format', '{{.Config.Image}}', container], env);
    previousRevision = run(['inspect', '--format', '{{index .Config.Labels "com.ryvix.revision"}}', container], env);
    if (!previousImage || !/^[a-f0-9]{40}$/.test(previousRevision)) throw new Error('Existing release lacks rollback metadata');
  }
  // Existing selected workers must belong to the same rollback revision.
  const existingWorkers = [];
  for (const worker of workers) {
    const id = run([...compose,'ps','-q',worker],env);
    if (id) {
      const revision = run(['inspect','--format','{{index .Config.Labels "com.ryvix.revision"}}',id],env);
      if (!previousRevision || revision !== previousRevision) throw new Error('Worker/web revisions differ; reconcile before deployment');
      existingWorkers.push(worker);
    }
  }
  // Pull failure leaves the running release untouched.
  run([...compose, 'pull', ...services], env);
  const verify = async revision => {
    const response = await request(health, { signal: AbortSignal.timeout(15000), redirect: 'error', cache: 'no-store' });
    if (!response.ok) throw new Error('Release health endpoint failed');
    const body = await response.json();
    if (body.status !== 'ok' || body.revision !== revision) throw new Error('Health response did not match the deployed revision');
  };
  try {
    if (workers.length) run([...compose,'stop',...workers],env);
    run([...compose, 'up', '-d', '--wait', '--wait-timeout', '180', ...services], env);
    await verify(env.RYVIX_RELEASE_SHA);
    return { deployed: true, revision: env.RYVIX_RELEASE_SHA };
  } catch {
    if (previousImage) {
      try {
        if (workers.length) run([...compose,'stop',...workers],env);
        const rollback = { ...env, RYVIX_IMAGE: previousImage, RYVIX_RELEASE_SHA: previousRevision,
          RYVIX_WORKER_IMAGE: previousImage.replace(/:([a-f0-9]{40})$/, '-workers:$1') };
        run([...compose, 'up', '-d', '--wait', '--wait-timeout', '180', 'web',...existingWorkers], rollback);
        await verify(previousRevision);
      } catch { throw new Error('Deployment and rollback verification failed; operator intervention required'); }
      throw new Error('Deployment failed; previous revision restored and verified');
    }
    run([...compose, 'stop', ...services], env);
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
