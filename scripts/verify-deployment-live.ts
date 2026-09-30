import fs from 'node:fs';
import { parseEnv } from 'node:util';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { Client, type Pool } from 'pg';
import { ingestGithubDeployment } from '../backend/src/services/deployment-ingestion';

// Explicit opt-in smoke test: synthetic fixtures in one rolled-back transaction.
// No provider request, real deployment or existing tenant mutation is performed.
async function main() {
  for (const file of ['.env','.env.local','web/.env.local'])
    if (fs.existsSync(file)) Object.assign(process.env, parseEnv(fs.readFileSync(file,'utf8')));
  const url = new URL(process.env.DATABASE_URL!);
  for (const key of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(key);
  const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT } });
  const orgId = randomUUID(), repoId = randomUUID(), projectId = randomUUID();
  try {
    await client.connect(); await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout='15s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query('INSERT INTO organizations(id,name,slug) VALUES($1,$2,$2)', [orgId, `rollout-${orgId}`]);
    await client.query("INSERT INTO projects(id,organization_id,name,slug) VALUES($1,$2,'Rollout fixture','rollout')", [projectId,orgId]);
    const githubId = 8_000_000_000_000 + randomBytes(4).readUInt32BE();
    const fullName = `rollout-fixture/${randomUUID()}`;
    await client.query(`INSERT INTO repositories(id,project_id,github_repo_id,full_name,clone_url,github_verified_at)
      VALUES($1,$2,$3,$4,$5,now())`, [repoId,projectId,githubId,fullName,`https://github.com/${fullName}.git`]);
    const transactionPool = { connect: async () => ({ release() {}, query: (sql: string, values?: unknown[]) =>
      ['BEGIN','COMMIT'].includes(sql) ? Promise.resolve({ rows: [] }) : client.query(sql, values) }) } as unknown as Pool;
    const secret = randomBytes(32).toString('hex');
    const body = Buffer.from(JSON.stringify({ repository: { id: githubId, full_name: fullName },
      deployment: { id: 1, sha: 'a'.repeat(40), environment: 'verification-fixture' },
      deployment_status: { id: 2, state: 'success', created_at: new Date().toISOString() } }));
    const headers = new Headers({ 'x-github-event': 'deployment_status', 'x-github-delivery': randomUUID(),
      'x-hub-signature-256': `sha256=${createHmac('sha256',secret).update(body).digest('hex')}` });
    await ingestGithubDeployment(body, headers, transactionPool, secret);
    headers.set('x-github-delivery', randomUUID());
    await ingestGithubDeployment(body, headers, transactionPool, secret);
    const events = await client.query('SELECT state FROM deployment_events WHERE repository_id=$1', [repoId]);
    assert.equal(events.rowCount, 1); assert.equal(events.rows[0].state, 'success');
    const audit = await client.query("SELECT id FROM audit_events WHERE project_id=$1 AND action_name='deployment.status.received'", [projectId]);
    assert.equal(audit.rowCount, 1);
    await client.query('ROLLBACK');
    assert.equal((await client.query('SELECT id FROM organizations WHERE id=$1', [orgId])).rowCount, 0);
    console.log('PASS deployment persistence and redelivery deduplication using real SQL; synthetic fixtures rolled back.');
  } finally { await client.query('ROLLBACK').catch(() => {}); await client.end().catch(() => {}); }
}
main().catch(error => {
  console.error(`Deployment SQL smoke check failed (${String(error.code || 'CHECK_FAILED').replace(/[^a-z0-9_]/gi,'')}).`);
  process.exitCode = 1;
});
