import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

export async function testDirectDbErrors() {
  const databaseError = Object.assign(new Error('sensitive row detail'), { code: '23505' });
  const notices: unknown[] = [];
  class Pool {
    constructor(_options: unknown) {}
    on() {}
    async query() { throw databaseError; }
  }
  const exports: Record<string, unknown> = {};
  const code = ts.transpileModule(fs.readFileSync('web/utils/direct-db.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports, URL, process: { env: { DATABASE_URL: 'postgres://example.invalid/db' } },
    console: { error: (...values: unknown[]) => notices.push(values) }, require(name: string) {
      if (name === 'server-only') return {};
      if (name === 'pg') return { Pool };
      throw new Error(`Unexpected module: ${name}`);
    } });
  await assert.rejects((exports.queryDirectDb as (sql: string) => Promise<unknown>)('SELECT 1'), error => {
    assert.equal((error as Error).message, 'Database operation failed');
    assert.equal((error as Error & { cause?: unknown }).cause, databaseError);
    assert.ok(!(error as Error).message.includes('sensitive row detail'));
    return true;
  });
  assert.equal(notices.length, 1);
  assert.equal((notices[0] as unknown[])[0], '[PostgreSQL Query Failure]');
  assert.equal(((notices[0] as unknown[])[1] as { code: string }).code, '23505');
}
