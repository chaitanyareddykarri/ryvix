import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import crypto from 'node:crypto';

export async function testTaskLifecycle() {
  let mode = 'ok'; let action = 'cancel';
  const calls: string[] = [];
  const client = { release() { calls.push('release'); }, async query(sql: string, params?: unknown[]) {
    calls.push(sql);
    if (sql.includes('SELECT t.id,t.project_id')) {
      assert.deepEqual(Array.from(params || []), [id, 'user', 'org']);
      assert.ok(sql.includes("t.created_by=$2") && sql.includes("m.role IN") && sql.includes('FOR UPDATE'));
      return { rows: mode === 'unauthorized' ? [] : [{ project_id: 'project', status: mode === 'completed' ? 'completed' : action === 'delete' ? 'cancelled' : 'executing' }] };
    }
    if (sql.includes('SELECT * FROM workspace_sessions')) return { rows: mode === 'cleaned' ? [] : [{ id: 'session', task_id: id }] };
    return { rows: [], rowCount: 1 };
  } };
  const exports: any = {};
  const code = ts.transpileModule(fs.readFileSync('web/utils/task-lifecycle.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require(name: string) {
    if (name === 'server-only') return {};
    if (name === 'node:crypto') return crypto;
    if (name === './direct-db') return { getDirectDbPool: () => ({ connect: async () => client, query: client.query }) };
    if (name === './tenant-context') return { RequestError: class extends Error { constructor(message: string, readonly status: number) { super(message); } } };
    if (name.endsWith('docker-workspace.manager')) return { dockerWorkspaceManager: {
      cleanupPersistedSession: async () => { calls.push('terminate'); if (mode === 'cleanup-failure') throw new Error('worker unavailable'); },
    } };
    throw new Error(name);
  } });
  const id = crypto.randomUUID();
  await exports.changeTaskLifecycle(id, action, 'user', 'org');
  assert.ok(calls.includes('COMMIT'), 'Cancellation must be durable');
  assert.ok(calls.some(sql => sql.includes('expires_at=LEAST(expires_at,now())')));
  assert.ok(!calls.includes('terminate'), 'Web must not execute Docker cleanup');
  assert.ok(!calls.some(sql => sql.includes("SET status='destroyed'")), 'Only worker confirmation marks destruction');
  for (mode of ['unauthorized', 'completed']) {
    calls.length = 0;
    await assert.rejects(exports.changeTaskLifecycle(id, 'cancel', 'user', 'org'));
    assert.ok(!calls.includes('terminate') && calls.includes('ROLLBACK'));
  }
  mode = 'cleanup-failure'; action = 'delete'; calls.length = 0;
  await assert.rejects(exports.changeTaskLifecycle(id, action, 'user', 'org'));
  assert.ok(!calls.some(sql => sql.startsWith('DELETE FROM tasks')), 'Keep records for cleanup retry');
  mode = 'cleaned'; calls.length = 0;
  await exports.changeTaskLifecycle(id, action, 'user', 'org');
  assert.ok(calls.some(sql => sql.startsWith('DELETE FROM tasks') && sql.includes('NOT EXISTS')));
}
