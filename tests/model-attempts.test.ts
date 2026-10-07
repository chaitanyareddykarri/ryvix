import assert from 'node:assert/strict';
import {ModelGateway} from '../ai/src/model-gateway';
import type {ModelAttempt} from '../ai/src/model-attempt';
import {embedRepositoryTexts} from '../ai/src/repository-embeddings';
import {rerankSources} from '../ai/src/semantic-reranking';
export async function testModelAttempts(){
 const original=global.fetch,selected=process.env.RYVIX_CHAT_PROVIDER;delete process.env.RYVIX_CHAT_PROVIDER;
 const gateway=new ModelGateway();(gateway as any).providers=['groq','openai'].map((id,i)=>({id,name:id,model:'fixture',baseUrl:'https://fixture.invalid',apiKey:'fixture',priority:i,isRateLimitedUntil:0}));(gateway as any).getApiKey=()=> 'fixture';
 const events:ModelAttempt[]=[];let calls=0;
 try{
  global.fetch=async()=>{calls++;return calls===1?new Response('',{status:503}):new Response('data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: {"usage":{"prompt_tokens":12,"completion_tokens":3}}\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});};
  for await(const _ of gateway.stream([{role:'user',content:'fixture'}],{onAttempt:async a=>{events.push(a);}})){}
  assert.deepEqual(events.map(e=>e.status),['started','failed','started','completed']);assert.equal(events[1].usage,null);assert.equal(events[3].usage?.completionTokens,3);assert.notEqual(events[0].id,events[2].id);
  events.length=0;global.fetch=async()=>new Response('data: {"choices":[{"delta":{"content":"partial"}}],"usage":{"prompt_tokens":12,"completion_tokens":1}}\n\n',{headers:{'content-type':'text/event-stream'}});
  await assert.rejects(async()=>{for await(const _ of gateway.stream([{role:'user',content:'fixture'}],{onAttempt:async a=>{events.push(a);}})){}},/interrupted/);
  assert.deepEqual(events.map(e=>e.status),['started','failed']);assert.equal(events[1].usage?.completionTokens,1);
  events.length=0;const iterator=gateway.stream([{role:'user',content:'fixture'}],{onAttempt:async a=>{events.push(a);}});await iterator.next();await iterator.return(undefined);
  assert.equal(events[1].status,'cancelled');
  calls=0;global.fetch=async()=>{calls++;throw new Error('Must not call provider');};
  await assert.rejects(async()=>{for await(const _ of gateway.stream([{role:'user',content:'fixture'}],{onAttempt:async()=>{throw new Error('Ledger unavailable');}})){}},/Ledger unavailable/);assert.equal(calls,0);
  events.length=0;calls=0;
  global.fetch=async()=>++calls===1?new Response('',{status:503}):Response.json({choices:[{message:{content:'answer'}}],usage:{prompt_tokens:7,completion_tokens:2}});
  await gateway.complete([{role:'user',content:'fixture'}],{requireProvider:true,onAttempt:async a=>{events.push(a);}});
  assert.deepEqual(events.map(e=>e.status),['started','failed','started','completed']);assert.equal(events[3].usage?.promptTokens,7);
  calls=0;await assert.rejects(gateway.complete([],{onAttempt:async()=>{throw new Error('Ledger unavailable');}}),/Ledger unavailable/);assert.equal(calls,0);
  events.length=0;const controller=new AbortController();global.fetch=async()=>{controller.abort();throw new Error('aborted');};
  await assert.rejects(gateway.complete([],{signal:controller.signal,onAttempt:async a=>{events.push(a);}}),/cancelled/);
  assert.deepEqual(events.map(e=>e.status),['started','cancelled']);
  events.length=0;calls=0;const duringStart=new AbortController();
  global.fetch=async()=>{calls++;return Response.json({choices:[{message:{content:'unexpected'}}]});};
  await assert.rejects(gateway.complete([],{signal:duringStart.signal,onAttempt:async a=>{events.push(a);if(a.status==='started')duringStart.abort();}}),/cancelled/);
  assert.equal(calls,0);assert.deepEqual(events.map(e=>e.status),['started','cancelled']);
  calls=0;
  await assert.rejects(gateway.complete([],{onAttempt:async a=>{if(a.status!=='started')throw new Error('Final ledger unavailable');}}),/Final ledger unavailable/);
  assert.equal(calls,1,'A final ledger failure must not dispatch a fallback provider');
  const names=['GEMINI_API_KEY','GEMINI_EMBEDDING_MODEL','RYVIX_REPOSITORY_SEMANTIC_ENABLED'];const saved=names.map(n=>process.env[n]);
  try {
   process.env.GEMINI_API_KEY='fixture';process.env.GEMINI_EMBEDDING_MODEL='fixture';process.env.RYVIX_REPOSITORY_SEMANTIC_ENABLED='true';
   events.length=0;global.fetch=async()=>Response.json({embeddings:[{values:[1,0]}]});
   await embedRepositoryTexts(['fixture'],false,undefined,async a=>{events.push(a);});
   assert.deepEqual(events.map(e=>e.status),['started','completed']);assert.equal(events[1].usage,null);
   events.length=0;global.fetch=async()=>Response.json({embeddings:[{values:[0,0]}],usageMetadata:{promptTokenCount:8}});
   await assert.rejects(embedRepositoryTexts(['fixture'],false,undefined,async a=>{events.push(a);}),/norm/);
   assert.equal(events[1].status,'failed');assert.equal(events[1].usage?.promptTokens,8);
   calls=0;global.fetch=async()=>{calls++;throw new Error('unexpected');};
   await assert.rejects(embedRepositoryTexts(['fixture'],false,undefined,async()=>{throw new Error('Ledger unavailable');}),/Ledger unavailable/);assert.equal(calls,0);
   events.length=0;const cancelled=new AbortController();
   await assert.rejects(embedRepositoryTexts(['fixture'],false,cancelled.signal,async a=>{events.push(a);if(a.status==='started')cancelled.abort();}));
   assert.equal(calls,0);assert.deepEqual(events.map(e=>e.status),['started','cancelled']);
   global.fetch=async()=>{calls++;return Response.json({embeddings:[{values:[1,0]}]});};
   await assert.rejects(embedRepositoryTexts(['fixture'],false,undefined,async a=>{if(a.status!=='started')throw new Error('Final ledger unavailable');}),/Final ledger unavailable/);
   assert.equal(calls,1);
   const sources=[{id:'source',title:'Fixture',excerpt:'Reviewed fixture'}];
   calls=0;events.length=0;
   global.fetch=async()=>{calls++;return Response.json({embeddings:[{values:[1,0]},{values:[1,0]}],usageMetadata:{promptTokenCount:9}});};
   assert.match((await rerankSources('fixture',sources,undefined,async a=>{events.push(a);})).mode,/semantic/);
   assert.deepEqual(events.map(e=>e.status),['started','completed']);assert.equal(events[1].usage?.promptTokens,9);assert.equal(events[1].usage?.completionTokens,null);
   calls=0;
   assert.match((await rerankSources('fixture',sources,undefined,async()=>{throw new Error('Ledger unavailable');})).mode,/lexical/);assert.equal(calls,0);
   assert.match((await rerankSources('fixture',sources,undefined,async a=>{if(a.status!=='started')throw new Error('Final ledger unavailable');})).mode,/lexical/);assert.equal(calls,1);
   events.length=0;calls=0;const rerankCancelled=new AbortController();
   await assert.rejects(rerankSources('fixture',sources,rerankCancelled.signal,async a=>{events.push(a);if(a.status==='started')rerankCancelled.abort();}),/cancelled/);
   assert.equal(calls,0);assert.deepEqual(events.map(e=>e.status),['started','cancelled']);
   const previousEnvironment=process.env.NODE_ENV;
   try {
    process.env.NODE_ENV='production';calls=0;
    await assert.rejects(gateway.complete([]),/scoped usage accounting/);
    await assert.rejects(async()=>{for await(const _ of gateway.stream([])){}},/scoped usage accounting/);
    await assert.rejects(embedRepositoryTexts(['fixture']),/scoped usage accounting/);
    assert.match((await rerankSources('fixture',sources)).mode,/lexical/);assert.equal(calls,0);
    (gateway as any).providers=[];
    await assert.rejects(gateway.complete([],{onAttempt:async()=>{}}),/No AI provider/);
   } finally {if(previousEnvironment===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previousEnvironment;}
  } finally {names.forEach((n,i)=>{if(saved[i]===undefined)delete process.env[n];else process.env[n]=saved[i];});}
 }finally{global.fetch=original;if(selected===undefined)delete process.env.RYVIX_CHAT_PROVIDER;else process.env.RYVIX_CHAT_PROVIDER=selected;}
}
