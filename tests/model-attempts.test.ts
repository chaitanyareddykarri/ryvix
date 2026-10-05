import assert from 'node:assert/strict';
import {ModelGateway} from '../ai/src/model-gateway';
import type {ModelAttempt} from '../ai/src/model-attempt';
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
 }finally{global.fetch=original;if(selected===undefined)delete process.env.RYVIX_CHAT_PROVIDER;else process.env.RYVIX_CHAT_PROVIDER=selected;}
}
