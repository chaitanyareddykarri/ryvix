import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

export async function testDashboardData() {
  const code = ts.transpileModule(fs.readFileSync('web/app/api/dashboard/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
  let denied = false;
  let failTable = '';
  const calls: Array<{ table: string; column: string; values: unknown }> = [];
  const records: Record<string, unknown[]> = {
    projects: [{ id: 'project-owned' }], environments: [{ id: 'env-owned' }], servers: [{ id: 'server-owned' }],
    incidents: [], security_events: [], audit_events: [], health_checks: [],
  };
  const db = { from(table: string) {
    const builder: any = {
      select: () => builder, order: () => builder, limit: () => builder,
      eq: (column: string, values: unknown) => { calls.push({ table, column, values }); return builder; },
      in: (column: string, values: unknown) => { calls.push({ table, column, values }); return builder; },
      then: (resolve: any) => Promise.resolve({ data: records[table], error: table === failTable ? { message: 'private database error' } : null }).then(resolve),
    };
    return builder;
  } };
  const exports: any = {};
  vm.runInNewContext(code, { exports, require(name: string) {
    if (name === 'next/server') return { NextResponse: { json: (body: unknown, init?: any) => ({ body, status: init?.status || 200 }) } };
    if (name === '@/utils/tenant-context') return { RequestError, requireTenant: async () => {
      if (denied) throw new RequestError('Authentication required.', 401);
      return { db, organizationId: 'tenant-owned' };
    } };
    throw new Error(name);
  } });
  const empty = await exports.GET();
  assert.equal(empty.status, 200);
  for (const rows of Object.values(empty.body)) assert.equal((rows as unknown[]).length, 0);
  assert.deepEqual(calls.find(c => c.table === 'projects'), { table: 'projects', column: 'organization_id', values: 'tenant-owned' });
  for (const [table, column, id] of [['incidents', 'environment_id', 'env-owned'], ['security_events', 'server_id', 'server-owned'], ['audit_events', 'project_id', 'project-owned']]) {
    const call = calls.find(c => c.table === table);
    assert.equal(call?.column, column);
    assert.equal(JSON.stringify(call?.values), JSON.stringify([id]));
  }
  records.incidents = [{ id: 'recorded-incident', status: 'open' }];
  assert.equal((await exports.GET()).body.incidents[0].id, 'recorded-incident');
  failTable = 'security_events';
  const failed = await exports.GET();
  assert.equal(failed.status, 503);
  assert.equal(failed.body.incidents, undefined, 'An I/O failure must not masquerade as healthy empty data');
  assert.ok(!failed.body.error.includes('private'));
  calls.length = 0;
  denied = true;
  assert.equal((await exports.GET()).status, 401);
  assert.equal(calls.length, 0);
}
