import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';

export class ProbeTargetError extends Error {}
export function publicProbeIPv4(value: string) {
  if (isIP(value) !== 4) return false;
  const [a,b] = value.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0));
}
type Resolve = (host: string) => Promise<Array<{address: string; family: number}>>;
export async function validateProbeTarget(value: string, resolve: Resolve = host => lookup(host, { family: 4, all: true })) {
  let url: URL;
  try { url = new URL(value); } catch { throw new ProbeTargetError('Provide a public HTTP or HTTPS URL.'); }
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.hash || url.port)
    throw new ProbeTargetError('Use public HTTP/HTTPS on its standard port, without URL credentials or fragments.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const answers = isIP(url.hostname) ? [{address:url.hostname,family:isIP(url.hostname)}] : await Promise.race([
      resolve(url.hostname), new Promise<never>((_,reject) => { timer = setTimeout(() => reject(new ProbeTargetError('Target DNS lookup timed out.')), 3000); }),
    ]);
    if (!answers.length || answers.some(answer => !publicProbeIPv4(answer.address)))
      throw new ProbeTargetError('Target must resolve exclusively to public IPv4 addresses.');
    return { url, address: answers[0].address };
  } finally { clearTimeout(timer); }
}

export async function probePublicEndpoint(value: string) {
  const {url,address} = await validateProbeTarget(value);
  const started = performance.now();
  return new Promise<{isReachable:boolean; status:'reachable'|'unreachable'; statusCode?:number; latencyMs:number; error?:string}>(resolve => {
    let finished = false;
    const finish = (isReachable: boolean, statusCode?: number, error?: string) => {
      if (finished) return; finished = true; clearTimeout(deadline);
      resolve({isReachable,status:isReachable?'reachable':'unreachable',statusCode,latencyMs:Math.round(performance.now()-started),error});
    };
    const request = (url.protocol === 'https:' ? https : http).request(url, {
      method: 'GET', agent: false, maxHeaderSize: 16384,
      headers: {'User-Agent':'Ryvix-Health-Probe','Accept':'*/*'},
      // Pin the validated address; no second DNS lookup and no redirects.
      lookup: ((_host: string, options: any, callback: any) => options?.all
        ? callback(null,[{address,family:4}]) : callback(null,address,4)) as any,
    }, response => {
      finish(!!response.statusCode && response.statusCode >= 200 && response.statusCode < 300, response.statusCode);
      response.destroy(); request.destroy();
    });
    const deadline = setTimeout(() => { finish(false,undefined,'Endpoint request timed out.'); request.destroy(); }, 5000);
    request.on('error', () => finish(false,undefined,'Endpoint connection failed.'));
    request.end();
  });
}

export function correlateProbe(reachable: boolean, heartbeat: string | null, now = Date.now()) {
  const age = heartbeat ? now - Date.parse(heartbeat) : NaN;
  const fresh = Number.isFinite(age) && age >= 0 && age <= 90000;
  if (!fresh) return {status:'unknown',diagnosis:'heartbeat_unavailable',explanation:
    'Endpoint reachability was measured. A fresh authenticated server heartbeat is unavailable; host health cannot be established.'};
  return reachable ? {status:'healthy',diagnosis:'healthy',explanation:'Endpoint responded successfully and the selected server has a fresh authenticated heartbeat.'}
    : {status:'degraded',diagnosis:'endpoint_unreachable',explanation:'The selected server has a fresh authenticated heartbeat, but the endpoint did not respond successfully.'};
}
