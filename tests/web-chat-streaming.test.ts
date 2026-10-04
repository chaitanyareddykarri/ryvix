import {estimateUsageCost} from '../ai/src/token-usage';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { randomUUID } from 'node:crypto';
import { DeviceError } from '../backend/src/services/device-protocol';
import { CHAT_SYSTEM_PROMPT } from '../ai/src/chat-policy';
import { ContextBuilder } from '../ai/src/context/context-builder';

export async function testWebChatStreaming() {
  class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
  let denied = false, dataFailure = false, providerFailure = false, dataReads = 0;
  let partialFailure = false, saved = 0, emitted = 0;
  const observations = { servers: [], deployments: { recordsAvailable: false }, healthChecks: [], incidents: [], securityEvents: [] };
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/app/api/chat/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, Response, ReadableStream, TextEncoder, Buffer, AbortController, AbortSignal, require(name: string) {
    if (name.endsWith('/token-usage')) return {estimateUsageCost};
    if (name === 'next/server') return { NextResponse: { json: Response.json } };
    if (name === 'node:crypto') return { randomUUID };
    if (name === '@/utils/tenant-context') return { RequestError, requireTenant: async () => {
      if (denied) throw new RequestError('Authentication required.', 401);
      return { organizationId: 'verified-organization', user: { id: 'verified-user' } };
    } };
    if (name === '@/utils/device-ingestion') return { boundedDeviceBody: async (request: Request) => Buffer.from(await request.text()) };
    if (name.endsWith('/device-protocol')) return { DeviceError };
    if (name.endsWith('/chat-policy')) return { CHAT_SYSTEM_PROMPT };
    if (name.endsWith('/context/context-builder')) return { ContextBuilder };
    if (name === '@/utils/chat-retrieval') return { retrieveChatSources: async () => [] };
    if (name === '@/utils/repository-chat-context') return {repositoryChatContext:async()=>({sources:[]})};
    if (name.endsWith('/semantic-reranking')) return {rerankSources:async(_question:string,sources:unknown[])=>({sources,mode:'fixture'})};
    if (name === '@/utils/direct-db') return { getDirectDbPool: () => ({}) };
    if(name.endsWith('/repository-knowledge'))return {RepositoryKnowledge:class {async search(){return [];}}};
    if (name.endsWith('/experience-store')) return {ExperienceStore:class {
      async memories(org:string,user:string){assert.equal(org,'verified-organization');assert.equal(user,'verified-user');return [{kind:'preference',content:'Use brief explanations.',expires_at:'2026-12-01'}];}
      async retrieve(){return [];}
    }};
    if (name.endsWith('/conversation-store')) return { ConversationError: RequestError, ConversationStore: class {
      async begin() { return { id: randomUUID(), lease: randomUUID(), history: [{ role:'user',content:'Earlier I asked about server health.' }] }; }
      async finish() { saved++; }
      async release() {}
    } };
    if (name === '@/utils/diagnostic-context') return { diagnosticContext: async (org: string, user: string) => {
      dataReads++;
      assert.equal(org, 'verified-organization'); assert.equal(user, 'verified-user');
      if (dataFailure) throw new Error('private database detail');
      return observations;
    } };
    if (name === '@ryvix/services') return { modelGateway: { stream: async function* (messages: any[], options: any) {
      assert.equal(options.maxTokens, 4096);
      assert.equal(messages[1].content,'Earlier I asked about server health.');
      const context = JSON.parse(messages[messages.length-1].content);
      assert.equal(context.personalMemory[0].content,'Use brief explanations.');
      assert.deepEqual(JSON.parse(context.observations), observations);
      assert.ok(!messages.some(message => message.content.includes('attacker-organization')));
      if (providerFailure) throw new Error('private provider detail');
      emitted++;
      yield 'No server measurements';
      if (partialFailure) throw new Error('private partial stream detail');
      emitted++;
      yield ' or deployment results are available.';
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
  assert.equal(emitted,1,'Provider stream must not be fully consumed before response starts');
  assert.equal((await exports.POST(request())).status,429,'In-flight stream retains concurrency guard');
  const text = await response.text();
  for (const event of ['start', 'thought', 'plan', 'token', 'done']) assert.ok(text.includes(`event: ${event}`));
  assert.ok(!text.includes('event: approval'));
  assert.ok(!text.includes('event: diff'));
  assert.ok(!text.includes('srv_prod_01'));
  assert.match(text, /No server measurements/);
  assert.equal(saved,1);
  const json = await (await exports.POST(request(false))).json();
  assert.equal(json.success, true); assert.deepEqual(json.sources, observations);
  dataFailure = true;
  const failedData = await exports.POST(request());
  assert.equal(failedData.status, 503); assert.ok(!(await failedData.text()).includes('private database detail'));
  dataFailure = false; providerFailure = true;
  const failedProvider = await exports.POST(request());
  assert.equal(failedProvider.status, 503); assert.ok(!(await failedProvider.text()).includes('private provider detail'));
  providerFailure=false; partialFailure=true;
  const before=saved;
  const partial=await exports.POST(request());
  const partialText=await partial.text();
  assert.ok(partialText.includes('event: error'));
  assert.ok(!partialText.includes('event: done') && !partialText.includes('private partial'));
  assert.equal(saved,before,'Partial output must not enter conversation history');
  partialFailure=false;
  const cancelled=await exports.POST(request());
  await cancelled.body.cancel();
  assert.equal(saved,before);
  assert.equal((await exports.POST(request(false))).status,200,'Cancellation releases concurrency guard');
}
