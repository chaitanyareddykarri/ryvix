import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';

export class DeploymentEventError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
const maximumBody = 1024 * 1024;
export async function deploymentWebhookBody(request: Request): Promise<Buffer> {
  if (Number(request.headers.get('content-length')) > maximumBody)
    throw new DeploymentEventError('Webhook body too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new DeploymentEventError('Webhook body required.', 400);
  const chunks: Uint8Array[] = []; let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { void reader.cancel().catch(() => {}); reject(new DeploymentEventError('Webhook body timed out.', 408)); }, 10000);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      size += value.byteLength;
      if (size > maximumBody) throw new DeploymentEventError('Webhook body too large.', 413);
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
}

/** Provider observations only: never triggers deployment or asserts runtime health. */
export async function ingestGithubDeployment(body: Buffer, headers: Headers, pool: Pool,
  secret = process.env.GITHUB_WEBHOOK_SECRET || '') {
  if (secret.length < 32 || /placeholder|your-github/i.test(secret))
    throw new DeploymentEventError('GitHub webhook signing is not configured.', 503);
  if (body.length > maximumBody) throw new DeploymentEventError('Webhook body too large.', 413);
  const signature = headers.get('x-hub-signature-256') || '';
  const expected = createHmac('sha256', secret).update(body).digest();
  if (!/^sha256=[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex')))
    throw new DeploymentEventError('Invalid webhook signature.', 401);
  const event = headers.get('x-github-event');
  if (event === 'ping') return { accepted: true };
  if (event !== 'deployment_status') return { accepted: false, ignored: true };
  const delivery = headers.get('x-github-delivery') || '';
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(delivery))
    throw new DeploymentEventError('Invalid webhook delivery identifier.', 400);
  let payload;
  try { payload = JSON.parse(body.toString('utf8')); }
  catch { throw new DeploymentEventError('Invalid webhook payload.', 400); }
  const repo = payload?.repository, deployment = payload?.deployment, status = payload?.deployment_status;
  const environment = status?.environment || deployment?.environment;
  const created = typeof status?.created_at === 'string' ? Date.parse(status.created_at) : NaN;
  const positiveId = (id: unknown) => typeof id === 'number' && Number.isSafeInteger(id) && id > 0;
  if (!positiveId(repo?.id) || !positiveId(deployment?.id) || !positiveId(status?.id) ||
    typeof repo?.full_name !== 'string' || !/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repo.full_name) ||
    typeof deployment?.sha !== 'string' || !/^[a-f0-9]{40,64}$/.test(deployment.sha) ||
    typeof environment !== 'string' || !environment.trim() || environment.length > 255 || /[\x00-\x1f]/.test(environment) ||
    !['error','failure','inactive','in_progress','queued','pending','success'].includes(status?.state) ||
    !Number.isFinite(created) || created > Date.now() + 300000)
    throw new DeploymentEventError('Invalid deployment status payload.', 400);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const repositories = await client.query(`SELECT r.id,r.project_id FROM repositories r
      WHERE r.github_repo_id=$1 AND lower(r.full_name)=lower($2) AND r.github_verified_at IS NOT NULL FOR SHARE`, [repo.id, repo.full_name]);
    const hash = createHash('sha256').update(body).digest('hex');
    for (const repository of repositories.rows) {
      const inserted = await client.query(`INSERT INTO deployment_events(repository_id,delivery_id,github_status_id,
        github_deployment_id,commit_sha,environment,state,provider_created_at,payload_hash)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING RETURNING id`,
      [repository.id, delivery, status.id, deployment.id, deployment.sha, environment, status.state, new Date(created), hash]);
      if (!inserted.rows[0]) continue;
      await client.query(`INSERT INTO audit_events(project_id,actor_type,action_name,parameters_hash,diff_summary,status)
        VALUES($1,'system','deployment.status.received',$2,$3,'success')`,
      [repository.project_id, hash, `GitHub deployment ${deployment.id}: ${status.state}`]);
    }
    await client.query('COMMIT');
    // Do not expose tenant mapping/counts to a webhook sender.
    return { accepted: true };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}
