import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import * as protocol from '../backend/src/services/device-protocol';

export async function testDeviceIngestion() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const key = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  const calls: string[] = [];
  let mode = 'ok';
  let released = 0;
  const client = { release() { released++; }, async query(sql: string) {
    calls.push(sql);
    if (sql.includes('SELECT c.id,c.device_public_key')) return { rows: mode === 'revoked' ? [] : [{ id: randomUUID(), device_public_key: key }] };
    if (sql.includes('SELECT 1 FROM connector_telemetry_receipts')) return { rows: mode === 'replay' ? [{}] : [] };
    if (sql.includes('count(*)::int')) return { rows: [{ count: mode === 'rate' ? 200 : 0 }] };
    if (sql.includes('INSERT INTO telemetry_metric_rollups') && mode === 'db-failure') throw new Error('private database detail');
    return { rows: [] };
  } };
  const exports: any = {};
  const code = ts.transpileModule(fs.readFileSync('web/utils/device-ingestion.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports, Buffer, require(name: string) {
    if (name === 'server-only') return {};
    if (name === 'node:crypto') return require('node:crypto');
    if (name === './direct-db') return { getDirectDbPool: () => ({ connect: async () => client }) };
    if (name.endsWith('/device-protocol')) return protocol;
    throw new Error(`Unexpected dependency ${name}`);
  } });
  const now = String(Date.now()), nonce = randomUUID();
  const body = Buffer.from(JSON.stringify({ serverId: randomUUID(), timestamp: new Date().toISOString(),
    metrics: { cpuUsagePercent: 0, memoryUsagePercent: 40, diskUsagePercent: 80, memoryUsedMb: 400 } }));
  const headers = new Headers({ 'x-ryvix-timestamp': now, 'x-ryvix-nonce': nonce,
    'x-ryvix-signature': sign(null, protocol.signingMessage(body, now, nonce), privateKey).toString('base64') });
  assert.equal((await exports.ingestDevice(body, headers)).success, true);
  assert.equal(calls.at(-1), 'COMMIT');
  for (mode of ['revoked', 'replay', 'rate', 'db-failure']) {
    calls.length = 0;
    await assert.rejects(() => exports.ingestDevice(body, headers));
    assert.equal(calls.at(-1), 'ROLLBACK');
    assert.ok(!calls.includes('COMMIT'));
    if (mode !== 'db-failure') assert.ok(!calls.some(sql => sql.includes('INSERT INTO telemetry_metric_rollups')));
  }
  assert.equal(released, 5);
  mode = 'ok'; calls.length = 0;
  await assert.rejects(() => exports.ingestDevice(body, new Headers()));
  assert.ok(!calls.some(sql => sql.includes('INSERT INTO')));
  await assert.rejects(() => exports.boundedDeviceBody(new Request('https://example.test', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(8193),
  }), 8192));
  // A token must never enroll if its persisted invitation/membership lookup fails.
  await assert.rejects(() => exports.registerDevice({ enrollmentToken: 'a'.repeat(43), publicKey: key, osType: 'linux', agentVersion: '2.4.0' }));
  assert.equal(calls.at(-1), 'ROLLBACK');
}
