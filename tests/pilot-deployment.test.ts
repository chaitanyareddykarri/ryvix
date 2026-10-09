import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceCapacity} from '../services/src/workspace/host-budget';
import {ModelGateway} from '../ai/src/model-gateway';
import {ModelQuotaError} from '../ai/src/model-capacity';

test('approved Gemini to Groq fallback preserves context and accounts for both attempts',async()=>{
  const saved={...process.env}, original=globalThis.fetch;
  try {
    Object.assign(process.env,{RYVIX_MODEL_PROVIDER:'gemini',RYVIX_CHAT_PROVIDER:'gemini',RYVIX_MODEL_FALLBACK_ORDER:'gemini,groq',GEMINI_MODEL:'fixture-primary',GROQ_MODEL:'fixture-backup',GEMINI_API_KEY:'fixture',GROQ_API_KEY:'fixture'});
    const messages=[{role:'system' as const,content:'Preserve repository constraints'},{role:'user' as const,content:'Fix the selected task; previous test failed'}];
    const calls:string[]=[], attempts:string[]=[];
    globalThis.fetch=async(url,init)=>{
      calls.push(String(url));const body=JSON.parse(String(init?.body));assert.deepEqual(body.messages,messages);
      if(String(url).includes('generativelanguage'))return new Response('',{status:429});
      assert.equal(body.model,'fixture-backup');
      return body.stream?new Response('data: {"choices":[{"delta":{"content":"backup answer"}}]}\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}}):Response.json({choices:[{message:{content:'backup answer'}}]});
    };
    const result=await new ModelGateway().complete(messages,{onAttempt:a=>{attempts.push(`${a.provider}:${a.status}`);}});
    assert.equal(result.providerUsed,'groq');assert.equal(result.failoverOccurred,true);
    assert.deepEqual(attempts,['gemini:started','gemini:failed','groq:started','groq:completed']);
    let output='';for await(const chunk of new ModelGateway().stream(messages,{onAttempt:()=>{}}))output+=chunk;
    assert.equal(output,'backup answer');assert.equal(calls.length,4);
    globalThis.fetch=async()=>new Response('',{status:429});
    await assert.rejects(new ModelGateway().complete(messages,{onAttempt:()=>{}}),error=>error instanceof ModelQuotaError&&error.retryAt>Date.now());
    process.env.RYVIX_MODEL_FALLBACK_ORDER='gemini,groq,groq';
    await assert.rejects(new ModelGateway().complete(messages,{onAttempt:()=>{}}),/Invalid model/);
  } finally {globalThis.fetch=original;for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);}
});

test('fallback never mixes a partial stream with a second model',async()=>{
  const saved={...process.env},original=globalThis.fetch;let calls=0;
  try {
    Object.assign(process.env,{RYVIX_MODEL_PROVIDER:'gemini',RYVIX_CHAT_PROVIDER:'gemini',RYVIX_MODEL_FALLBACK_ORDER:'gemini,groq',GEMINI_MODEL:'fixture',GROQ_MODEL:'fixture',GEMINI_API_KEY:'fixture',GROQ_API_KEY:'fixture'});
    globalThis.fetch=async()=>{calls++;return new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n',{headers:{'content-type':'text/event-stream'}});};
    let output='';await assert.rejects(async()=>{for await(const chunk of new ModelGateway().stream([{role:'user',content:'test'}],{onAttempt:()=>{}}))output+=chunk;},/interrupted/);
    assert.equal(output,'partial');assert.equal(calls,1);
  } finally {globalThis.fetch=original;for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);}
});

test('retained Docker sessions consume budget after restart and inventory failures close admission',async()=>{
  const env={RYVIX_WORKSPACE_MAX_SESSIONS:'1',RYVIX_WORKSPACE_MEMORY_BUDGET_MB:'4608',RYVIX_WORKSPACE_CPU_BUDGET:'2'};
  const base={Config:{Labels:{'ryvix.workspace':'true','ryvix.session':'s'}},HostConfig:{NanoCpus:1e9,Memory:2048*1048576}};
  const result=(stdout:string)=>({exitCode:0,stdout,stderr:''});
  assert.equal(await workspaceCapacity(async()=>result(''),1,2048,env),true);
  assert.equal(await workspaceCapacity(async args=>result(args[0]==='ps'?'abcdef123456':JSON.stringify([base])),1,2048,env),false);
  await assert.rejects(workspaceCapacity(async()=>({exitCode:1,stdout:'',stderr:''}),1,2048,env),/inventory/);
  await assert.rejects(workspaceCapacity(async args=>result(args[0]==='ps'?'abcdef123456':JSON.stringify([{...base,HostConfig:{}}])),1,2048,env),/Unbounded/);
});

test('explicit model selection applies to coding and never falls through to other credentials',async()=>{
  const saved={...process.env};const original=globalThis.fetch;const calls:string[]=[];
  try{
    process.env.RYVIX_MODEL_PROVIDER='gemini';process.env.GEMINI_MODEL='fixture-model';process.env.GEMINI_API_KEY='fixture';process.env.OPENAI_API_KEY='fixture';
    globalThis.fetch=async(url,init)=>{calls.push(String(url));assert.equal(JSON.parse(String(init?.body)).model,'fixture-model');return Response.json({choices:[{message:{content:'ok'}}],usage:{prompt_tokens:2,completion_tokens:1}});};
    const result=await new ModelGateway().complete([{role:'user',content:'test'}],{requireProvider:true,onAttempt:()=>{}});
    assert.equal(result.modelUsed,'fixture-model');assert.equal(result.providerUsed,'gemini');assert.equal(calls.length,1);
    calls.length=0;globalThis.fetch=async url=>{calls.push(String(url));return new Response('',{status:429});};
    await assert.rejects(new ModelGateway().complete([{role:'user',content:'test'}],{requireProvider:true,onAttempt:()=>{}}));
    assert.equal(calls.length,1);assert.match(calls[0],/generativelanguage/);
    calls.length=0;
    const streamed:string[]=[];
    globalThis.fetch=async(_url,init)=>{
      assert.equal(JSON.parse(String(init?.body)).model,'fixture-model');
      return new Response('data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
    };
    for await(const chunk of new ModelGateway().stream([{role:'user',content:'test'}],{onAttempt:()=>{}}))streamed.push(chunk);
    assert.equal(streamed.join(''),'hello');
    delete process.env.GEMINI_MODEL;await assert.rejects(new ModelGateway().complete([],{onAttempt:()=>{}}),/explicit model/);
  }finally{globalThis.fetch=original;for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);}
});
