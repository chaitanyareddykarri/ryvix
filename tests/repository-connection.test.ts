import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { RepositoryConnectionStore } from '../backend/src/services/repository-connection-store';

export async function testRepositoryConnection() {
  let mode = 'ok';
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const client = { release() {}, async query(sql: string, values?: unknown[]) {
    calls.push({ sql, values });
    if (sql.includes('FROM organization_members')) return { rows: mode === 'denied' ? [] : [{ role: 'developer' }] };
    if (sql.includes('SELECT r.project_id')) return { rows: mode === 'shared' || mode === 'reconnect' ? [{ project_id: 'project' }] : [] };
    if (sql.includes('github_repo_id<>')) return { rows: mode === 'shared' ? [{ id: 'another-repo' }] : [] };
    if (sql.includes('INSERT INTO projects')) return { rows: [{ id: 'project' }] };
    if (sql.includes('INSERT INTO environments')) return { rows: [{ id: 'environment' }] };
    if (sql.includes('SELECT id FROM connectors')) return { rows: mode === 'reconnect' ? [{ id: 'connector' }] : [] };
    if (sql.includes('INSERT INTO connectors')) return { rows: [{ id: 'connector' }] };
    if (sql.includes('SELECT vault_secret_ref')) return { rows: mode === 'reconnect' ? [{ vault_secret_ref: 'previous-reference' }] : [] };
    if (sql.includes('vault.create_secret')) { if (mode === 'vault-failure') throw new Error('unavailable'); return { rows: [{ id: 'secret-reference' }] }; }
    if (sql.includes('INSERT INTO repositories')) return { rows: [{ id: 'repository', project_id: 'project', full_name: 'acme/app' }] };
    if (sql.includes('INSERT INTO audit_events') && mode === 'audit-failure') throw new Error('unavailable');
    return { rows: [] };
  } };
  const requests: string[] = [];
  const request = (async (url: string, init: RequestInit) => {
    requests.push(url); assert.equal(init.redirect, 'error');
    return new Response(JSON.stringify(url.includes('/branches/') ? { name: 'main' } : {
      id: 123, full_name: 'acme/app', default_branch: 'main', private: true,
    }), { status: mode === 'github-denied' ? 404 : 200 });
  }) as typeof fetch;
  const store = new RepositoryConnectionStore({ connect: async () => client } as unknown as Pool, request);
  const input = { organizationId: 'org', userId: 'user', fullName: 'acme/app', token: 'test-only-token', branch: 'main' };
  const result = await store.connect(input);
  assert.equal(result.id, 'repository');
  assert.ok(calls.some(c => c.sql === 'COMMIT'));
  assert.equal(calls.find(c => c.sql.includes('vault.create_secret'))?.values?.[0], input.token);
  assert.ok(!JSON.stringify(result).includes(input.token));
  assert.ok(calls.find(c => c.sql.includes('INSERT INTO repositories'))?.sql.includes('ON CONFLICT (project_id, github_repo_id)'));
  for (mode of ['denied', 'vault-failure', 'audit-failure', 'github-denied', 'shared']) {
    calls.length = 0;
    await assert.rejects(store.connect(input));
    assert.ok(!calls.some(c => c.sql === 'COMMIT'));
    if (mode !== 'github-denied') assert.ok(calls.some(c => c.sql === 'ROLLBACK'));
  }
  mode = 'ok'; requests.length = 0;
  await assert.rejects(store.connect({ ...input, fullName: 'https://evil.test/app' }));
  assert.equal(requests.length, 0);
  mode = 'reconnect'; calls.length = 0;
  await store.connect(input);
  assert.ok(!calls.some(c => c.sql.includes('INSERT INTO projects') || c.sql.includes('INSERT INTO connectors')));
  assert.ok(calls.some(c => c.sql.includes('DELETE FROM vault.secrets') && c.values?.[0] === 'previous-reference'));

  // Execute the actual HTTP boundary with only external dependencies replaced.
  class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
  let role = 'viewer', writes = 0;
  const exports: any = {};
  const route = ts.transpileModule(fs.readFileSync('web/app/api/github/repositories/connect/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(route, { exports, require(name: string) {
    if (name === 'next/server') return { NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) } };
    if (name === 'next/headers') return { cookies: async () => ({ get: () => ({ value: input.token }) }) };
    if (name === '@/utils/tenant-context') return { RequestError,
      requireTenant: async () => ({ user: { id: 'user' }, organizationId: 'org', role }),
      requireOperator: (value: string) => { if (value === 'viewer') throw new RequestError('Denied', 403); },
    };
    if (name === '@/utils/direct-db') return { getDirectDbPool: () => ({}) };
    if (name.endsWith('repository-connection-store')) return { RepositoryConnectionError: RequestError,
      RepositoryConnectionStore: class { async connect() { writes++; if (mode === 'route-failure') throw new Error(input.token); return { id: 'persisted-id' }; } },
    };
    throw new Error(`Unexpected dependency ${name}`);
  } });
  const req = { json: async () => ({ repo: { full_name: 'acme/app' }, branch: 'main' }) };
  assert.equal((await exports.POST(req)).status, 403); assert.equal(writes, 0);
  role = 'developer'; mode = 'route-failure';
  const failed = await exports.POST(req);
  assert.equal(failed.status, 503); assert.ok(!JSON.stringify(failed).includes(input.token));
  mode = 'ok'; assert.equal((await exports.POST(req)).body.repository.id, 'persisted-id');
}
