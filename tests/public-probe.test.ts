import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validateProbeTarget, publicProbeIPv4, correlateProbe } from '../services/src/monitoring/public-probe';

export async function testPublicProbe() {
  for (const ip of ['127.0.0.1','10.1.1.1','169.254.169.254','172.16.1.1','192.168.1.1','100.64.0.1','0.0.0.0','198.18.0.1','224.0.0.1','::1'])
    assert.equal(publicProbeIPv4(ip), false);
  assert.equal(publicProbeIPv4('8.8.8.8'), true);
  const lookup = async () => [{ address: '8.8.8.8', family: 4 }];
  for (const url of ['file:///etc/passwd','https://user:secret@example.test','http://127.0.0.1','https://example.test:8443','http://169.254.169.254'])
    await assert.rejects(validateProbeTarget(url, lookup));
  await assert.rejects(validateProbeTarget('https://example.test', async () => [{address:'10.0.0.1',family:4}]), /public/i);
  await assert.rejects(validateProbeTarget('https://example.test', async () => [{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]), /public/i);
  assert.equal((await validateProbeTarget('https://example.test/health', lookup)).address, '8.8.8.8');
  const now = Date.now();
  assert.equal(correlateProbe(true, null, now).status, 'unknown');
  assert.equal(correlateProbe(true, new Date(now + 10000).toISOString(), now).status, 'unknown');
  assert.equal(correlateProbe(true, new Date(now).toISOString(), now).status, 'healthy');
  assert.equal(correlateProbe(false, new Date(now).toISOString(), now).diagnosis, 'endpoint_unreachable');
  assert.equal(correlateProbe(false, new Date(now - 180000).toISOString(), now).status, 'unknown');
  class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
  let denied = true, probes = 0, serverFound = false, registered = false;
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/app/api/monitoring/probe/route.ts','utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require(name: string) {
    if (name === 'next/server') return { NextResponse: { json: (body: any, init?: any) => ({body,status:init?.status || 200}) } };
    if (name === '@/utils/tenant-context') return {RequestError,requireTenant:async () => {
      if (denied) throw new RequestError('Denied',401); return {organizationId:'org',user:{id:'user'},role:'developer'};
    },requireOperator:()=>{}};
    if (name === '@/utils/direct-db') return { queryDirectDb: async (sql: string, args: string[]) => {
      assert.match(sql,/p.organization_id=\$1/); assert.equal(args[0],'org'); assert.equal(args[1],'user');
      return serverFound ? [{last_heartbeat_at:new Date().toISOString(),endpoint_registered:registered}] : [];
    } };
    if (name.endsWith('/public-probe')) return {correlateProbe,ProbeTargetError:class extends Error{},probePublicEndpoint:async () => {probes++;return {isReachable:true};}};
    throw new Error(name);
  }});
  const req = (extra = {}) => ({json:async () => ({targetUrl:'https://example.test',...extra})});
  assert.equal((await exports.POST(req())).status,401); assert.equal(probes,0);
  denied = false;
  const server = {serverId:'12345678-1234-1234-1234-123456789012'};
  assert.equal((await exports.POST(req(server))).status,404); assert.equal(probes,0);
  serverFound = true;
  assert.equal((await exports.POST(req(server))).body.evaluation.status,'unknown');
  registered = true;
  assert.equal((await exports.POST(req(server))).body.evaluation.status,'healthy');
  assert.equal((await exports.POST(req())).body.evaluation.status,'unknown');
}
