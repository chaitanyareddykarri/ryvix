import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { measuredTelemetry, signingMessage, verifyDeviceRequest, devicePublicKey } from '../backend/src/services/device-protocol';

export async function testDeviceProtocol() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const encoded = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  const now = Date.now();
  const payload = { serverId: randomUUID(), timestamp: new Date(now).toISOString(),
    metrics: { cpuUsagePercent: 0, memoryUsagePercent: 20, diskUsagePercent: 40, memoryUsedMb: 123.4 } };
  const raw = Buffer.from(JSON.stringify(payload));
  const nonce = randomUUID();
  const headers = new Headers({ 'x-ryvix-timestamp': String(now), 'x-ryvix-nonce': nonce,
    'x-ryvix-signature': sign(null, signingMessage(raw, String(now), nonce), privateKey).toString('base64') });
  assert.equal(verifyDeviceRequest(raw, headers, encoded, now), nonce);
  assert.equal(measuredTelemetry(raw, now).cpu, 0);
  assert.throws(() => verifyDeviceRequest(Buffer.from('{}'), headers, encoded, now));
  assert.throws(() => verifyDeviceRequest(raw, headers, encoded, now + 120001));
  assert.throws(() => devicePublicKey('invalid'));
  assert.throws(() => verifyDeviceRequest(raw, new Headers(), encoded, now));
  for (const value of [undefined, null, -1, 101, '20']) {
    assert.throws(() => measuredTelemetry(Buffer.from(JSON.stringify({ ...payload,
      metrics: { ...payload.metrics, cpuUsagePercent: value } })), now));
  }
  const other = generateKeyPairSync('ed25519').publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  assert.throws(() => verifyDeviceRequest(raw, headers, other, now));
}
