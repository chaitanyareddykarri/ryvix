import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import crypto from 'node:crypto';

export async function testConnectionPersistence() {
  const code = ts.transpileModule(fs.readFileSync('web/app/api/connections/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
  const environmentId = crypto.randomUUID(), connectionId = crypto.randomUUID(), secretId = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString('hex');
  let role = 'developer', authorized = true, validToken = true, failVault = false, auth = true;
  let verifications = 0;
  const calls: Array<{ sql: string; params: any[] }> = [];
  const record = { id: connectionId, name: 'Repository access', type: 'github', status: 'active', environment_id: environmentId };
  const client = { release() {}, async query(sql: string, params: any[] = []) {
    calls.push({ sql, params });
    if (sql.includes('FOR SHARE OF m')) return { rows: authorized ? [{ id: environmentId, project_id: 'owned-project' }] : [] };
    if (sql.includes('vault.create_secret')) {
      if (failVault) throw new Error('private connection string and secret details');
      return { rows: [{ id: secretId }] };
    }
    if (sql.startsWith('SELECT vault_secret_ref')) return { rows: [{ vault_secret_ref: secretId }] };
    if (sql.includes('RETURNING id,name') || sql.includes('FOR UPDATE')) return { rows: [{ ...record, status: params[2] === 'revoked' ? 'revoked' : 'active' }] };
    if (sql.includes('FROM connectors c')) return { rows: [record] };
    if (sql.startsWith('SELECT e.id,e.name')) return { rows: [{ id: environmentId, name: 'Production' }] };
    return { rows: [] };
  } };
  const exports: any = {};
  vm.runInNewContext(code, { exports, require(name: string) {
    if (name === 'next/server') return { NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) } };
    if (name === 'node:crypto') return crypto;
    if (name === '@/utils/tenant-context') return { RequestError,
      requireTenant: async () => { if (!auth) throw new RequestError('Authentication required.', 401); return { user: { id: 'owned-user' }, organizationId: 'owned-tenant', role }; },
      requireOperator: (value: string) => { if (value === 'viewer') throw new RequestError('Forbidden', 403); } };
    if (name === '@/utils/direct-db') return { getDirectDbPool: () => ({ connect: async () => client, query: client.query }) };
    if (name.endsWith('/pr.service')) return { PullRequestService: { verifyGitHubToken: async () => { verifications++; return { valid: validToken }; } } };
    throw new Error(name);
  } });
  const request = (extra: any = {}) => ({ json: async () => ({ environmentId, id: connectionId, type: 'github', name: 'Repository access', config: { token }, ...extra }) });
  const success = await exports.POST(request());
  assert.equal(success.status, 200);
  assert.equal(success.body.connection.id, connectionId);
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
  assert.ok(calls.find(c => c.sql.includes('vault.create_secret')));
  assert.ok(calls.find(c => c.sql.includes('FOR SHARE OF m'))?.params.includes('owned-tenant'));
  assert.ok(!JSON.stringify(success.body).includes(token));
  assert.ok(!JSON.stringify(success.body).includes(secretId));
  calls.length = 0; authorized = false; verifications = 0;
  assert.equal((await exports.POST(request())).status, 403);
  assert.equal(verifications, 0, 'Do not transmit secrets until tenant access is checked');
  assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
  assert.ok(!calls.some(c => c.sql.startsWith('INSERT')));
  authorized = true; failVault = true; calls.length = 0;
  const failed = await exports.POST(request());
  assert.equal(failed.status, 503);
  assert.equal(failed.body.success, undefined);
  assert.ok(!failed.body.error.includes('private'));
  assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
  failVault = false; validToken = false; calls.length = 0;
  assert.equal((await exports.PATCH(request())).status, 422);
  assert.ok(!calls.some(c => c.sql.startsWith('DELETE')));
  validToken = true; calls.length = 0;
  assert.equal((await exports.DELETE(request({ config: undefined }))).body.connection.status, 'revoked');
  assert.ok(calls.some(c => c.sql.startsWith('DELETE FROM vault.secrets')));
  assert.ok(calls.some(c => c.sql.startsWith('INSERT INTO audit_events')));
  assert.equal((await exports.GET()).body.connections[0].id, connectionId);
  role = 'viewer'; calls.length = 0;
  assert.equal((await exports.POST(request())).status, 403);
  assert.equal(calls.length, 0);
  auth = false;
  assert.equal((await exports.GET()).status, 401);
}
