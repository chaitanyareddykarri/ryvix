import {createHmac,timingSafeEqual} from 'node:crypto';
import {workerPreviewDomain} from './worker-host';
/** Web signs from authorized persisted metadata; it never invokes Docker. */
export function persistedPreviewLaunchUrl(session: {id:string;worker_host_id?:string|null;preview_url?:string|null;expires_at:string;status:string}) {
  const expires=Date.parse(session.expires_at);
  if(!/^[a-f0-9-]{36}$/.test(session.id)||session.status!=='active'||!Number.isFinite(expires)||expires<=Date.now()||!session.worker_host_id)
    throw new Error('Preview unavailable');
  const origin=`https://${session.id}.${workerPreviewDomain(session.worker_host_id)}`;
  if(session.preview_url!==origin && session.preview_url!==origin+'/')throw new Error('Preview owner/domain mismatch');
  return `${origin}/?__ryvix_grant=${signPreviewGrant(session.id,Math.min(Date.now()+60000,expires))}`;
}

export function previewSigningKey() {
  const value = process.env.PREVIEW_SIGNING_SECRET;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error('Preview signing secret is not configured');
  return Buffer.from(value, 'hex');
}
export function signPreviewGrant(sessionId: string, expiresAt: number) {
  const payload = Buffer.from(JSON.stringify({ sessionId, expiresAt })).toString('base64url');
  return `${payload}.${createHmac('sha256', previewSigningKey()).update(payload).digest('base64url')}`;
}
export function verifyPreviewGrant(value: string, sessionId: string, now = Date.now()): boolean {
  try {
    if (value.length > 1024) return false;
    const [payload, supplied, extra] = value.split('.');
    if (!payload || !supplied || extra) return false;
    const expected = createHmac('sha256', previewSigningKey()).update(payload).digest();
    const actual = Buffer.from(supplied, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.sessionId === sessionId && Number.isFinite(data.expiresAt) && data.expiresAt > now && data.expiresAt <= now + 900000;
  } catch { return false; }
}
