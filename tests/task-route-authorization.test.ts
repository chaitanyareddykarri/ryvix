import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real route handlers with isolated auth/database adapters.
function loadRoute(relativePath: string, user: any, rows: any[] = []) {
  const calls: Array<{ name: string; args: any[] }> = [];
  const query: any = {};
  for (const name of ['update', 'delete', 'eq', 'select']) {
    query[name] = (...args: any[]) => { calls.push({ name, args }); return query; };
  }
  query.maybeSingle = async () => ({ data: rows[0] || null, error: null });
  const supabase = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: (table: string) => { calls.push({ name: 'from', args: [table] }); return query; },
  };
  const exports: any = {};
  class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
  const code = ts.transpileModule(fs.readFileSync(path.resolve(relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, Date, console,
    require: (name: string) => {
      if (name === 'next/server') return { NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) } };
      if (name === 'next/headers') return { cookies: async () => ({}) };
      if (name === '@/utils/tenant-context') return { RequestError,
        requireTenant: async () => { if (!user) throw new RequestError('Authentication required', 401); return { user, organizationId: 'own-org', role: 'developer' }; },
        requireOperator: () => {},
      };
      if (name === '@/utils/task-lifecycle') return { changeTaskLifecycle: async (...args: any[]) => {
        calls.push({ name: 'lifecycle', args });
        if (!rows.length) throw new RequestError('Task not found', 404);
      } };
      if (name === '@/utils/supabase/server') return { createClient: () => supabase };
      if (name === '@/utils/direct-db') return {
        queryDirectDb: async (...args: any[]) => { calls.push({ name: 'sql', args }); return rows; },
      };
      if (name === 'node:crypto') return {};
      return {};
    },
    URL,
  });
  return { route: exports, calls };
}

export async function testTaskRouteAuthorization() {
  const taskPath = 'web/app/api/tasks/route.ts';
  const request = { url: 'http://localhost/api/tasks?taskId=other-task', json: async () => ({ taskId: 'other-task', status: 'cancelled' }) };
  for (const method of ['PATCH', 'DELETE']) {
    const unauthenticated = loadRoute(taskPath, null);
    assert.equal((await unauthenticated.route[method](request)).status, 401);
    assert.equal(unauthenticated.calls.length, 0);

    const unauthorized = loadRoute(taskPath, { id: 'user-a' });
    assert.equal((await unauthorized.route[method](request)).status, 404);
    assert.ok(unauthorized.calls.some(call => call.name === 'lifecycle' && call.args[2] === 'user-a' && call.args[3] === 'own-org'));

    const authorized = loadRoute(taskPath, { id: 'user-a' }, [{ id: 'own-task' }]);
    assert.equal((await authorized.route[method](request)).status, 200);
  }

  const bypass = loadRoute(taskPath, { id: 'user-a' }, [{ id: 'own-task' }]);
  assert.equal((await bypass.route.PATCH({ json: async () => ({ taskId: 'own-task', status: 'completed' }) })).status, 400);
  assert.equal(bypass.calls.length, 0, 'Client-supplied completion cannot bypass GitHub approval');

  const settingsPath = 'web/app/api/settings/route.ts';
  const settingsRequest = { json: async () => ({ action: 'update_org', orgId: 'victim-org', orgName: 'Changed' }) };
  const missingOrg = loadRoute(settingsPath, { id: 'user-a' });
  assert.equal((await missingOrg.route.POST(settingsRequest)).status, 400);
  assert.equal(missingOrg.calls.length, 1);
  const viewer = loadRoute(settingsPath, { id: 'user-a' }, [{ organization_id: 'own-org', role: 'viewer' }]);
  assert.equal((await viewer.route.POST(settingsRequest)).status, 403);
  assert.ok(viewer.calls.every(call => !call.args[0].startsWith('UPDATE')));
}
