import {estimateUsageCost,type TokenUsage} from '../../../../ai/src/token-usage';
import {ModelUsage} from '../../../../backend/src/services/model-usage';
import {ExperienceStore} from '../../../../backend/src/services/experience-store';
import {RepositoryKnowledge} from '../../../../backend/src/services/repository-knowledge';
import { NextResponse } from 'next/server';
// Avoid importing the service barrel: it initializes disk-backed legacy AI stores.
import { modelGateway } from '../../../../ai/src/model-gateway';
import { requireTenant, RequestError } from '@/utils/tenant-context';
import { diagnosticContext } from '@/utils/diagnostic-context';
import { retrieveChatSources } from '@/utils/chat-retrieval';
import { getDirectDbPool } from '@/utils/direct-db';
import { boundedDeviceBody } from '@/utils/device-ingestion';
import { DeviceError } from '../../../../backend/src/services/device-protocol';
import { ConversationStore, ConversationError } from '../../../../backend/src/services/conversation-store';
import { ContextBuilder } from '../../../../ai/src/context/context-builder';
import { CHAT_SYSTEM_PROMPT } from '../../../../ai/src/chat-policy';
import { repositoryChatContext } from '@/utils/repository-chat-context';
import { rerankSources } from '../../../../ai/src/semantic-reranking';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 180;
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
    const retrievalQuery=[...session.history.filter(message=>message.role==='user').slice(-2).map(message=>message.content),prompt].join('\n');
    const experience=new ExperienceStore(getDirectDbPool());
    const memories=await experience.memories(organizationId,user.id);
    const lessonSources=(lessons:any[])=>lessons.map(l=>({id:'lesson:'+l.id,kind:'independently reviewed lesson',title:`Prior experience: ${l.project_name}`,date:l.observed_at,
      excerpt:ContextBuilder.sanitizeText(JSON.stringify({projectId:l.project_id,lesson:l.content,evidence:l.evidence,expires:l.expires_at})).slice(0,3000)}));
    const [context, excerpts] = await Promise.all([
      diagnosticContext(organizationId,user.id), retrieveChatSources(organizationId,user.id,retrievalQuery),
    ]);
    if(body.repositoryId !== undefined) {
      if(typeof body.repositoryId !== 'string')throw new RequestError('Invalid repository.',400);
      const repository=await repositoryChatContext(organizationId,user.id,body.repositoryId,prompt,signal);
      excerpts.push(...repository.sources);
      const lessons=await experience.retrieve(organizationId,user.id,repository.projectId,retrievalQuery);
      excerpts.push(...lessonSources(lessons));
    }else {
      excerpts.push(...lessonSources(await experience.retrieve(organizationId,user.id,null,retrievalQuery)));
      const knowledge=await new RepositoryKnowledge(getDirectDbPool()).search(organizationId,user.id,null,retrievalQuery);
      excerpts.push(...knowledge.map(row=>({id:`indexed:${row.full_name}:${row.commit_sha}:${row.path}`,kind:`${row.retrieval_kind||'indexed repository snapshot'} (not verified current branch)`,
        title:row.path,date:row.indexed_at,excerpt:ContextBuilder.sanitizeText(row.excerpt).slice(0,2000)})));
    }
    const ranked=await rerankSources(prompt,excerpts,signal,
      attempt=>new ModelUsage(getDirectDbPool()).record({org:organizationId,user:user.id,channel:'web',source:current.id},attempt));
    const intent = /deploy|release|commit|workflow/i.test(prompt) ? 'deployment'
      : /server|health|cpu|memory|disk|incident|security|latency/i.test(prompt) ? 'diagnostics'
      : /code|component|implement|refactor|repository|preview/i.test(prompt) ? 'coding' : 'general';
    const started = Date.now();
    let modelInfo: { provider:string; model:string } | undefined;
    let usage:TokenUsage|undefined;
    const measuredUsage=()=>usage&&modelInfo?{...usage,costEstimate:estimateUsageCost(modelInfo.provider,modelInfo.model,usage)}:null;
    signal.throwIfAborted();
    const iterator = modelGateway.stream([
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
      ...session.history.map(message => ({ ...message, content: ContextBuilder.sanitizeText(message.content) })),
      { role: 'user', content: ContextBuilder.sanitizeText(JSON.stringify({ question: prompt, intent,
        personalMemory:memories.slice(0,12).map(m=>({kind:m.kind,content:m.content,expires:m.expires_at})),
        observations: JSON.stringify(context).slice(0,24000),
        observationsTruncated: JSON.stringify(context).length>24000, sources: ranked.sources,retrievalMode:ranked.mode })) },
    ], { temperature: 0.2, maxTokens: 4096, signal,
      onAttempt:attempt=>new ModelUsage(getDirectDbPool()).record({org:organizationId,user:user.id,channel:'web',source:current.id},attempt),
      onUsage:value=>{usage=value;},onProvider:(provider,model)=>{ modelInfo={provider,model}; } });
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
        const turnId=await historyStore.finish(current.id,current.lease,organizationId,user.id,prompt,ContextBuilder.sanitizeText(answer),{latencyMs:Date.now()-started,provider:modelInfo?.provider,model:modelInfo?.model,usage:measuredUsage()});
        return NextResponse.json({ success: true, conversationId: current.id, turnId, response: answer,
          usage:measuredUsage(),sources: context, retrievedSources: excerpts, modelInfo, metrics: { totalDurationMs: Date.now()-started } },
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
        const turnId=await historyStore.finish(current.id,current.lease,organizationId,user.id,prompt,ContextBuilder.sanitizeText(answer),{latencyMs:Date.now()-started,provider:modelInfo?.provider,model:modelInfo?.model,usage:measuredUsage()});
        yield ['done',{ turnId,conversationId:current.id,totalDurationMs:Date.now()-started,status:'success',usage:measuredUsage() }];
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
