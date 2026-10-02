import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import crypto from 'node:crypto';
import { SettingsStore, SettingsError } from '../backend/src/services/settings-store';

export async function testSettingsBoundary() {
  class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
  let denied = true, failDb = false, calls = 0;
  const exports: any = {};
  const code = ts.transpileModule(fs.readFileSync('web/app/api/settings/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports, require(name: string) {
    if (name.endsWith('settings-store')) return {SettingsStore,SettingsError};
    if (name === 'node:crypto') return crypto;
    if (name === 'next/server') return { NextResponse: { json: (body: unknown, init?: any) => ({ body, status: init?.status || 200 }) } };
    if (name === 'next/headers') return { cookies: async () => ({}) };
    if (name === '@/utils/supabase/server') return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) } }) };
    if (name === '@/utils/tenant-context') return { RequestError, requireTenant: async () => {
      if (denied) throw new RequestError('Authentication required.', 401);
      return { user: { id: 'user', user_metadata: {} }, organizationId: 'verified-org' };
    } };
    if (name === '@/utils/direct-db') return { queryDirectDb: async (sql: string, args: unknown[]) => {
      calls++;
      if (failDb) throw new Error('private database error');
      if (sql.includes('FROM profiles')) return [{ organization_id: 'stale-org', full_name: 'User' }];
      assert.equal(args[0], 'verified-org', 'Settings queries must use verified membership');
      return [];
    } };
    throw new Error(name);
  } });
  assert.equal((await exports.GET()).status, 401);
  assert.equal(calls, 0);
  denied = false;
  assert.equal((await exports.GET()).status, 200);
  failDb = true;
  for (const response of [await exports.GET(), await exports.POST({ json: async () => ({}) })]) {
    assert.equal(response.status, 503);
    assert.ok(!JSON.stringify(response.body).includes('private database'));
  }
}
