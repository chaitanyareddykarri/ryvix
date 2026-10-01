import { NextResponse } from 'next/server';
import { modelGateway } from '@ryvix/services';
import { requireTenant, RequestError } from '@/utils/tenant-context';
import { diagnosticContext } from '@/utils/diagnostic-context';
import { retrieveChatSources } from '@/utils/chat-retrieval';
import { getDirectDbPool } from '@/utils/direct-db';
import { boundedDeviceBody } from '@/utils/device-ingestion';
import { DeviceError } from '../../../../backend/src/services/device-protocol';
import { ConversationStore, ConversationError } from '../../../../backend/src/services/conversation-store';
import { ContextBuilder } from '../../../../ai/src/context/context-builder';
import { CHAT_SYSTEM_PROMPT } from '../../../../ai/src/chat-policy';

export const dynamic = 'force-dynamic';
const active = new Set<string>();

export async function POST(request: Request) {
  let activeKey: string | undefined, handedOff = false;
  let session: Awaited<ReturnType<ConversationStore['begin']>> | undefined;
  let store: ConversationStore | undefined;
  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal, AbortSignal.timeout(150000)]);
  const release = async () => {
    signal.removeEventListener('abort', onAbort);
    if (activeKey) { active.delete(activeKey); activeKey = undefined; }
    if (session && store) await store.release(session.id,session.lease).catch(() => {});
  };
  const onAbort = () => { void release(); };
  signal.addEventListener('abort', onAbort, { once:true });
  try {
    const { organizationId, user } = await requireTenant();
    const key = `${organizationId}:${user.id}`;
    if (active.has(key)) throw new RequestError('A chat request is already running. Please wait.',429);
    activeKey = key; active.add(key);
    let body;
    try { body = JSON.parse((await boundedDeviceBody(request,32768)).toString('utf8')); }
    catch (error) { if (error instanceof DeviceError) throw error; throw new RequestError('Invalid request JSON.',400); }
    const rawPrompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!rawPrompt || rawPrompt.length>10000) throw new RequestError('Provide a prompt of at most 10,000 characters.',400);
    if (body.conversationId !== undefined && typeof body.conversationId !== 'string') throw new RequestError('Invalid conversation identifier.',400);
    const prompt = ContextBuilder.sanitizeText(rawPrompt).slice(0,10000);
    store = new ConversationStore(getDirectDbPool());
    session = await store.begin(organizationId,user.id,body.conversationId);
    const current = session, historyStore = store;
    const [context, excerpts] = await Promise.all([
      diagnosticContext(organizationId,user.id), retrieveChatSources(organizationId,user.id,
        [...session.history.filter(message=>message.role==='user').slice(-2).map(message=>message.content),prompt].join('\n')),
    ]);
    const intent = /deploy|release|commit|workflow/i.test(prompt) ? 'deployment'
      : /server|health|cpu|memory|disk|incident|security|latency/i.test(prompt) ? 'diagnostics'
      : /code|component|implement|refactor|repository|preview/i.test(prompt) ? 'coding' : 'general';
    const started = Date.now();
    let modelInfo: { provider:string; model:string } | undefined;
    signal.throwIfAborted();
    const iterator = modelGateway.stream([
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
      ...session.history.map(message => ({ ...message, content: ContextBuilder.sanitizeText(message.content) })),
      { role: 'user', content: ContextBuilder.sanitizeText(JSON.stringify({ question: prompt, intent,
        observations: JSON.stringify(context).slice(0,24000),
        observationsTruncated: JSON.stringify(context).length>24000, sources: excerpts })) },
    ], { temperature: 0.2, maxTokens: 4096, signal,
      onProvider:(provider,model)=>{ modelInfo={provider,model}; } });
    const first = await iterator.next();
    if (first.done || !first.value) throw new Error('Empty model stream');
    let answer = first.value;
    const append = (chunk: string) => {
      answer += chunk;
      if (answer.length>64000) { abort.abort(); throw new Error('Answer exceeded limit'); }
    };
    if (body.stream === false) {
      try {
        for await (const chunk of iterator) append(chunk);
        signal.throwIfAborted();
        await historyStore.finish(current.id,current.lease,organizationId,user.id,prompt,ContextBuilder.sanitizeText(answer));
        return NextResponse.json({ success: true, conversationId: current.id, response: answer,
          sources: context, retrievedSources: excerpts, modelInfo, metrics: { totalDurationMs: Date.now()-started } },
          { headers: { 'Cache-Control':'no-store' } });
      } finally { await iterator.return(undefined); }
    }
    async function* events(): AsyncGenerator<[string,unknown]> {
      try {
        yield ['start',{ conversationId: current.id, modelInfo }];
        yield ['thought',{ type:'retrieval',label:'Authorized context retrieved',content:`Retrieved observations and ${excerpts.length} source excerpts.` }];
        yield ['plan',{ intent,actionPlan:['Explain the available evidence and its limitations.'] }];
        yield ['sources',{ sources: excerpts }];
        yield ['token',{ chunk: first.value }];
        for await (const chunk of iterator) { append(chunk); yield ['token',{ chunk }]; }
        signal.throwIfAborted();
        await historyStore.finish(current.id,current.lease,organizationId,user.id,prompt,ContextBuilder.sanitizeText(answer));
        yield ['done',{ totalDurationMs:Date.now()-started,status:'success' }];
      } catch {
        yield ['error',{ error:'Response interrupted or could not be saved. Please retry.' }];
      } finally { abort.abort(); await iterator.return(undefined); await release(); }
    }
    const output = events(), encoder = new TextEncoder();
    const stream = new ReadableStream({
      async pull(controller) {
        const next = await output.next();
        if (next.done) { controller.close(); return; }
        const [event,data] = next.value;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      },
      async cancel() { abort.abort(); await output.return(undefined); await iterator.return(undefined); await release(); },
    }, { highWaterMark:0 });
    handedOff = true;
    return new Response(stream,{ headers:{ 'Content-Type':'text/event-stream; charset=utf-8',
      'Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no' } });
  } catch (error) {
    const known = error instanceof RequestError || error instanceof DeviceError || error instanceof ConversationError;
    return NextResponse.json({ error:known ? error.message : 'Diagnostics unavailable. Verify data access and AI provider configuration.' },
      { status:known ? error.status : 503 });
  } finally { if (!handedOff) { abort.abort(); await release(); } }
}
