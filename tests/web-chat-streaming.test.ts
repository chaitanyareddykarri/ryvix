import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { randomUUID } from 'node:crypto';
import { DeviceError } from '../backend/src/services/device-protocol';

export async function testWebChatStreaming() {
  class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
  let denied = false, dataFailure = false, providerFailure = false, dataReads = 0;
  const observations = { servers: [], deployments: { recordsAvailable: false }, healthChecks: [], incidents: [], securityEvents: [] };
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/app/api/chat/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, Response, ReadableStream, TextEncoder, Buffer, require(name: string) {
    if (name === 'next/server') return { NextResponse: { json: Response.json } };
    if (name === 'node:crypto') return { randomUUID };
    if (name === '@/utils/tenant-context') return { RequestError, requireTenant: async () => {
      if (denied) throw new RequestError('Authentication required.', 401);
      return { organizationId: 'verified-organization', user: { id: 'verified-user' } };
    } };
    if (name === '@/utils/device-ingestion') return { boundedDeviceBody: async (request: Request) => Buffer.from(await request.text()) };
    if (name.endsWith('/device-protocol')) return { DeviceError };
    if (name === '@/utils/diagnostic-context') return { diagnosticContext: async (org: string, user: string) => {
      dataReads++;
      assert.equal(org, 'verified-organization'); assert.equal(user, 'verified-user');
      if (dataFailure) throw new Error('private database detail');
      return observations;
    } };
    if (name === '@ryvix/services') return { modelGateway: { complete: async (messages: any[], options: any) => {
      assert.equal(options.requireProvider, true);
      const context = JSON.parse(messages[1].content);
      assert.deepEqual(context.observations, observations);
      assert.ok(!messages.some(message => message.content.includes('attacker-organization')));
      if (providerFailure) throw new Error('private provider detail');
      return { content: 'No server measurements or deployment results are available.' };
    } } };
    throw new Error(name);
  } });
  const request = (stream = true) => new Request('https://example.test/api/chat', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'Is my server healthy?', stream,
      organizationId: 'attacker-organization', userId: 'attacker-user', userRole: 'owner' }) });
  denied = true;
  assert.equal((await exports.POST(request())).status, 401);
  assert.equal(dataReads, 0);
  denied = false;
  const response = await exports.POST(request());
  assert.equal(response.status, 200);
  const text = await response.text();
  for (const event of ['start', 'thought', 'plan', 'token', 'done']) assert.ok(text.includes(`event: ${event}`));
  assert.ok(!text.includes('event: approval'));
  assert.ok(!text.includes('event: diff'));
  assert.ok(!text.includes('srv_prod_01'));
  assert.match(text, /No server measurements/);
  const json = await (await exports.POST(request(false))).json();
  assert.equal(json.success, true); assert.deepEqual(json.sources, observations);
  dataFailure = true;
  const failedData = await exports.POST(request());
  assert.equal(failedData.status, 503); assert.ok(!(await failedData.text()).includes('private database detail'));
  dataFailure = false; providerFailure = true;
  const failedProvider = await exports.POST(request());
  assert.equal(failedProvider.status, 503); assert.ok(!(await failedProvider.text()).includes('private provider detail'));
}
