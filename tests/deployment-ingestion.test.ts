import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { deploymentWebhookBody, ingestGithubDeployment } from '../backend/src/services/deployment-ingestion';

export async function testDeploymentIngestion() {
  const secret = 'test-only-webhook-signing-material';
  const payload = { repository: { id: 123, full_name: 'acme/app' },
    deployment: { id: 8, sha: 'a'.repeat(40), environment: 'production' },
    deployment_status: { id: 9, state: 'success', created_at: '2026-09-29T10:00:00Z' } };
  const body = Buffer.from(JSON.stringify(payload));
  const headers = new Headers({ 'x-github-event': 'deployment_status', 'x-github-delivery': randomUUID(),
    'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}` });
  let mode = 'ok'; const calls: string[] = [];
  const pool = { connect: async () => ({ release() {}, async query(sql: string) {
    calls.push(sql);
    if (sql.includes('SELECT r.id')) {
      assert.match(sql, /github_verified_at IS NOT NULL/);
      assert.match(sql, /github_repo_id=\$1/); assert.match(sql, /lower\(r.full_name\)=lower\(\$2\)/);
      return { rows: mode === 'unmapped' ? [] : [{ id: 'repo', project_id: 'project' }] };
    }
    if (sql.includes('INSERT INTO deployment_events')) return { rows: mode === 'duplicate' ? [] : [{ id: 'event' }] };
    if (sql.includes('INSERT INTO audit_events') && mode === 'audit-failed') throw new Error('audit failed');
    return { rows: [] };
  } }) } as unknown as Pool;
  assert.equal((await ingestGithubDeployment(body, headers, pool, secret)).accepted, true);
  assert.ok(calls.includes('COMMIT'));
  for (mode of ['duplicate', 'unmapped']) {
    calls.length = 0; await ingestGithubDeployment(body, headers, pool, secret);
    assert.ok(!calls.some(sql => sql.includes('INSERT INTO audit_events')));
  }
  mode = 'audit-failed'; calls.length = 0;
  await assert.rejects(ingestGithubDeployment(body, headers, pool, secret));
  assert.ok(calls.includes('ROLLBACK')); assert.ok(!calls.includes('COMMIT'));
  calls.length = 0;
  await assert.rejects(ingestGithubDeployment(Buffer.from('{}'), headers, pool, secret), /signature/i);
  await assert.rejects(ingestGithubDeployment(body, headers, pool, ''), /configured/i);
  assert.equal(calls.length, 0);
  const malformed = Buffer.from(JSON.stringify({ ...payload, deployment_status: { ...payload.deployment_status, state: 'made-up' } }));
  headers.set('x-hub-signature-256', `sha256=${createHmac('sha256', secret).update(malformed).digest('hex')}`);
  await assert.rejects(ingestGithubDeployment(malformed, headers, pool, secret), /payload/i);
  assert.equal(calls.length, 0);
  const emptyHeaders = new Headers();
  await assert.rejects(ingestGithubDeployment(body, emptyHeaders, pool, secret), /signature/i);
  await assert.rejects(deploymentWebhookBody(new Request('https://example.test', { method: 'POST', body: 'x'.repeat(1024 * 1024 + 1) })), /too large/i);
  assert.equal((await deploymentWebhookBody(new Request('https://example.test', { method: 'POST', body: '{}' }))).toString(), '{}');
}
