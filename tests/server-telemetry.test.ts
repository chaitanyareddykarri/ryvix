import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { serverTelemetry } from '../web/utils/server-telemetry';

export async function testServerTelemetry() {
  const now = Date.parse('2026-09-29T10:00:00Z');
  const measured = { bucket_timestamp: new Date(now - 1000), cpu_avg: '0.00', ram_percent: '52.31', disk_used_percent: 81 };
  const fresh = serverTelemetry(measured, now);
  assert.equal(fresh.telemetryStatus, 'fresh');
  assert.equal(fresh.cpuPercent, 0, 'Measured zero is a valid value');
  assert.equal(fresh.memoryPercent, 52.31);
  assert.equal(fresh.diskPercent, 81);
  assert.equal(fresh.uptimeSeconds, null);
  assert.equal(fresh.networkRxKb, null, 'Legacy default network values are not measurements');
  assert.equal(serverTelemetry({}, now).telemetryStatus, 'missing');
  const stale = serverTelemetry({ ...measured, bucket_timestamp: new Date(now - 120001) }, now);
  assert.equal(stale.telemetryStatus, 'stale');
  assert.equal(stale.cpuPercent, null);
  assert.ok(stale.latestSampleAt);
  assert.equal(serverTelemetry({ ...measured, bucket_timestamp: new Date(now + 60000) }, now).telemetryStatus, 'invalid');
  for (const value of [null, undefined, '', ' ', false, -1, 101, Infinity, 'NaN']) {
    assert.equal(serverTelemetry({ ...measured, cpu_avg: value }, now).cpuPercent, null);
  }
  class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
  let denied = false;
  let dbFailure = false;
  let queries = 0;
  let cloudAdapterCalls = 0;
  let rows: Record<string, unknown>[] = [];
  const exports: any = {};
  const code = ts.transpileModule(fs.readFileSync('web/app/api/servers/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports, require(name: string) {
    if (name === 'next/server') return { NextResponse: { json: (body: unknown, init?: any) => ({ body, status: init?.status || 200 }) } };
    if (name === '@/utils/supabase/server') return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'verified-user' } }, error: null }) } }) };
    if (name === 'next/headers') return { cookies: async () => ({}) };
    if (name === '@/utils/server-telemetry') return { serverTelemetry };
    if (name === '@/utils/tenant-context') return { RequestError, requireTenant: async () => {
      if (denied) throw new RequestError('Authentication required.', 401);
      return { organizationId: 'authorized-org', user: { id: 'verified-user' } };
    } };
    if (name === '@/utils/direct-db') return { queryDirectDb: async (sql: string, args: string[]) => {
      queries++;
      assert.equal(JSON.stringify(args), JSON.stringify(['authorized-org', 'verified-user']));
      assert.match(sql, /m.user_id = \$2/);
      assert.match(sql, /p.organization_id = \$1/);
      assert.match(sql, /WHERE server_id = s.id/);
      if (dbFailure) throw new Error('private database detail');
      return rows;
    } };
    if (name === '@ryvix/services') return { ServerAccessManager: {}, ServerClassifier: {}, CloudRecoveryBridge: class { executePowerAction() { cloudAdapterCalls++; } } };
    if (name === '../../../../backend/src/services/device-protocol') return { DeviceError: class extends Error {} };
    return {};
  } });
  assert.equal((await exports.GET()).body.servers.length, 0);
  const reboot = await exports.POST({ json: async () => ({ action: 'oob_cloud_reboot', serverId: 'server-1', approved: true }) });
  assert.equal(reboot.status, 409, 'A browser boolean must not authorize a high-impact cloud action');
  assert.equal(reboot.body.success, false);
  assert.equal(cloudAdapterCalls, 0, 'Unpersisted approval must never reach the provider adapter');
  const command = await exports.POST({ json: async () => ({ action: 'execute_capability', serverId: 'server-1', capability: 'service.restart' }) });
  assert.equal(command.status, 503, 'Remote commands stay unavailable until signed dispatch and persisted approval exist');
  assert.equal(cloudAdapterCalls, 0);
  rows = [{ id: 'persisted-server', hostname: 'stored-host', status: 'healthy', services: [] }];
  const missing = (await exports.GET()).body.servers[0];
  assert.equal(missing.cpuPercent, null);
  assert.equal(missing.ip, null);
  assert.equal(missing.status, 'unknown');
  assert.equal(missing.services.length, 0);
  dbFailure = true;
  const failed = await exports.GET();
  assert.equal(failed.status, 503);
  assert.equal(failed.body.servers, undefined);
  assert.ok(!failed.body.error.includes('private'));
  denied = true;
  const before = queries;
  assert.equal((await exports.GET()).status, 401);
  assert.equal(queries, before);
}
