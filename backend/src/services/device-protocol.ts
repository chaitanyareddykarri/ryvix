import { createHash, createPublicKey, verify } from 'node:crypto';

export class DeviceError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
export const deviceUuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const telemetryPath = '/api/connector/telemetry';
export function signingMessage(body: Buffer, timestamp: string, nonce: string) {
  return Buffer.from(`POST\n${telemetryPath}\n${timestamp}\n${nonce}\n${digest(body)}`);
}
export function devicePublicKey(encoded: unknown) {
  try {
    if (typeof encoded !== 'string' || !/^[A-Za-z0-9+/]{59}=$/.test(encoded)) throw new Error();
    const key = createPublicKey({ key: Buffer.from(encoded, 'base64'), format: 'der', type: 'spki' });
    if (key.asymmetricKeyType !== 'ed25519') throw new Error();
    return key;
  } catch { throw new DeviceError('A valid Ed25519 public key is required.'); }
}
export function verifyDeviceRequest(body: Buffer, headers: Headers, publicKey: string, now = Date.now()) {
  const timestamp = headers.get('x-ryvix-timestamp') || '';
  const nonce = headers.get('x-ryvix-nonce') || '';
  const signature = headers.get('x-ryvix-signature') || '';
  if (body.length > 262144) throw new DeviceError('Telemetry batch exceeds 256 KiB.', 413);
  if (!/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 120000 || !deviceUuid.test(nonce)
    || !/^[A-Za-z0-9+/]{86}==$/.test(signature)) throw new DeviceError('Invalid or expired device signature.', 401);
  if (!verify(null, signingMessage(body, timestamp, nonce), devicePublicKey(publicKey), Buffer.from(signature, 'base64')))
    throw new DeviceError('Device signature rejected.', 401);
  return nonce;
}
export function measuredTelemetry(body: Buffer, now = Date.now()) {
  let payload;
  try { payload = JSON.parse(body.toString('utf8')); } catch { throw new DeviceError('Invalid telemetry JSON.'); }
  if (!payload || !deviceUuid.test(payload.serverId || '') || typeof payload.timestamp !== 'string'
    || !Number.isFinite(Date.parse(payload.timestamp)) || Math.abs(now - Date.parse(payload.timestamp)) > 120000)
    throw new DeviceError('Valid server identity and fresh sample timestamp required.');
  const metrics = payload.metrics;
  if (!metrics || typeof metrics !== 'object') throw new DeviceError('Measured metrics required.');
  for (const field of ['cpuUsagePercent', 'memoryUsagePercent', 'diskUsagePercent']) {
    if (typeof metrics[field] !== 'number' || !Number.isFinite(metrics[field]) || metrics[field] < 0 || metrics[field] > 100)
      throw new DeviceError(`Invalid or missing ${field}.`);
  }
  if (typeof metrics.memoryUsedMb !== 'number' || !Number.isFinite(metrics.memoryUsedMb)
    || metrics.memoryUsedMb < 0 || metrics.memoryUsedMb > 2147483647)
    throw new DeviceError('Invalid or missing memoryUsedMb.');
  return { serverId: payload.serverId as string, timestamp: new Date(payload.timestamp),
    cpu: metrics.cpuUsagePercent as number, memory: metrics.memoryUsagePercent as number,
    disk: metrics.diskUsagePercent as number, memoryMb: Math.round(metrics.memoryUsedMb) };
}
