import { createServer, request as httpRequest, type Server } from 'node:http';
import {previewSigningKey as key,signPreviewGrant,verifyPreviewGrant} from './preview-grants';
export {persistedPreviewLaunchUrl,signPreviewGrant,verifyPreviewGrant} from './preview-grants';
import { dockerWorkspaceManager } from './docker-workspace.manager';

let gateway: Server | undefined;
function domain() {
  const value = process.env.PREVIEW_BASE_DOMAIN;
  if (!value || !/^[a-z0-9.-]+$/.test(value) || !value.includes('.') || /localhost|\.local$/.test(value))
    throw new Error('An HTTPS preview gateway domain is required');
  return value;
}
/** TLS terminates at the configured reverse proxy; the listener is loopback-only. */
export async function ensurePreviewGateway() {
  key(); const base = domain();
  const parent = new URL(process.env.RYVIX_PUBLIC_URL || '');
  if (parent.protocol !== 'https:' || parent.username || parent.password || parent.pathname !== '/' || parent.search || parent.hash)
    throw new Error('A public HTTPS application origin is required');
  if (gateway?.listening) return;
  if (gateway) throw new Error('Preview gateway is starting; retry');
  gateway = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', `sandbox allow-scripts allow-forms; object-src 'none'; base-uri 'self'; frame-ancestors ${parent.origin}`);
    const host = request.headers.host || '';
    const id = host.endsWith(`.${base}`) ? host.slice(0, -(base.length + 1)) : '';
    const session = /^[a-f0-9-]{36}$/.test(id) ? dockerWorkspaceManager.getSession(id) : null;
    if (!session || session.status !== 'active' || Date.parse(session.expires_at) <= Date.now() ||
        !session.preview_url || !session.preview_port || session.preview_port < 3100 || session.preview_port > 3999) {
      response.writeHead(404); response.end('Preview unavailable.'); return;
    }
    const url = new URL(request.url || '/', `https://${host}`);
    if (!['GET', 'HEAD'].includes(request.method || '')) { response.writeHead(405); response.end(); return; }
    const grant = url.searchParams.get('__ryvix_grant');
    const cookie = request.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('__Host-ryvix-preview='))?.slice(21);
    if (grant && verifyPreviewGrant(grant, id)) {
      const cookieGrant = signPreviewGrant(id, Math.min(Date.parse(session.expires_at), Date.now() + 900000));
      response.setHeader('Set-Cookie', `__Host-ryvix-preview=${cookieGrant}; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=${Math.max(1, Math.floor((Date.parse(session.expires_at) - Date.now()) / 1000))}`);
      response.writeHead(303, { Location: '/' }); response.end(); return;
    }
    if (!cookie || !verifyPreviewGrant(cookie, id)) { response.writeHead(401); response.end('Open this preview from Ryvix.'); return; }
    // Destination is exclusively the manager-assigned loopback port. No user URL, cookies or credentials are forwarded.
    const upstream = httpRequest({ hostname: '127.0.0.1', port: session.preview_port, method: request.method,
      path: url.pathname + url.search, headers: { host: 'localhost', accept: request.headers.accept || '*/*' }, timeout: 10000 }, result => {
      const location = result.headers.location;
      if (location && (!location.startsWith('/') || location.startsWith('//') || location.includes('\\'))) {
        result.destroy(); response.writeHead(502); response.end('External preview redirects are disabled.'); return;
      }
      for (const name of ['content-type', 'content-encoding', 'location']) if (result.headers[name]) response.setHeader(name, result.headers[name]!);
      response.writeHead(result.statusCode || 502);
      let bytes = 0;
      result.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 32 * 1024 * 1024) { result.destroy(); response.destroy(); }
      });
      result.pipe(response); // Node streams propagate downstream backpressure.
    });
    upstream.on('timeout', () => upstream.destroy(new Error('Preview timeout')));
    upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end('Preview unavailable.'); });
    response.on('close', () => upstream.destroy());
    upstream.end();
  });
  gateway.on('upgrade', (_request, socket) => socket.destroy());
  gateway.maxConnections = 128;
  gateway.headersTimeout = 10000;
  gateway.requestTimeout = 15000;
  gateway.keepAliveTimeout = 5000;
  try {
    await new Promise<void>((resolve, reject) => {
      gateway!.once('error', reject);
      gateway!.listen(Number(process.env.PREVIEW_GATEWAY_PORT || 8081), '127.0.0.1', resolve);
    });
    gateway.unref();
  } catch (error) { gateway = undefined; throw error; }
}
export function previewOrigin(sessionId: string) { return `https://${sessionId}.${domain()}`; }
export async function previewLaunchUrl(sessionId: string) {
  // The dedicated workspace worker owns the listener. Web processes only sign grants.
  const session = dockerWorkspaceManager.getSession(sessionId);
  if (!session?.preview_url || Date.parse(session.expires_at) <= Date.now()) throw new Error('Preview unavailable');
  return `${previewOrigin(sessionId)}/?__ryvix_grant=${signPreviewGrant(sessionId, Math.min(Date.now() + 60000, Date.parse(session.expires_at)))}`;
}
