import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

export async function testWorkspaceRouteBoundary() {
  class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
  let tenantFailure: Error | null = null;
  let directCalls = 0;
  const exports: Record<string, unknown> = {};
  const code = ts.transpileModule(fs.readFileSync('web/app/api/workspace/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports, require(name: string) {
    if (name === 'next/server') return { NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status || 200 }) } };
    if (name === '@/utils/tenant-context') return { RequestError, requireTenant: async () => {
      if (tenantFailure) throw tenantFailure;
      return { user: { id: 'user' }, organizationId: 'org' };
    } };
    if (name === '@/utils/direct-db') return { queryDirectDb: async () => { directCalls++; return []; } };
    throw new Error(`Unexpected import in workspace route: ${name}`);
  } });

  const execute = await (exports.POST as (request: Request) => Promise<any>)(
    { json: async () => ({ action: 'execute', command: 'anything', sessionId: 'worker-session' }) } as unknown as Request);
  assert.equal(execute.status, 503);
  assert.match(execute.body.error, /Direct workspace commands are unavailable/);
  assert.equal(directCalls, 0);

  tenantFailure = new Error('private database host and query details');
  const failed = await (exports.POST as (request: Request) => Promise<any>)({ json: async () => ({ action: 'execute' }) } as unknown as Request);
  assert.equal(failed.status, 503);
  assert.equal(failed.body.error, 'Workspace operation unavailable.');
  assert.ok(!JSON.stringify(failed.body).includes('private database host'));
}
