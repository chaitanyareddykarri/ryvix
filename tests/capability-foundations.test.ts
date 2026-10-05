import assert from 'node:assert/strict';
import {streamUsage,estimateUsageCost} from '../ai/src/token-usage';
import {streamProvider} from '../ai/src/provider-stream';
import {repositoryDependencies} from '../ai/src/repository-dependencies';

export async function testCapabilityFoundations(){
  const parsed=repositoryDependencies([
    {path:'tsconfig.json',content:'{"compilerOptions":{"baseUrl":".","paths":{"@/*":["src/*"]}}}'},
    {path:'src/main.ts',content:"// import './ignored';\nexport {x} from '@/feature'; const p=import('./lazy.js'); const q=import(variable);"},
    {path:'src/ignored.ts',content:''},{path:'src/feature.ts',content:''},{path:'src/lazy.ts',content:''},
  ]);
  assert.deepEqual(parsed.map(e=>e.target).sort(),['src/feature.ts','src/lazy.ts']);
  assert.doesNotThrow(()=>repositoryDependencies([{path:'tsconfig.json',content:'null'},{path:'a.ts',content:"import 'alias';"}]));
  const start=streamUsage({type:'message_start',message:{usage:{input_tokens:10,cache_read_input_tokens:4,cache_creation_input_tokens:2,output_tokens:1}}},true)!;
  const end=streamUsage({type:'message_delta',usage:{output_tokens:7}},true,start)!;
  assert.equal(end.promptTokens,16);assert.equal(end.completionTokens,7);
  assert.equal(streamUsage({usage:{prompt_tokens:-1,completion_tokens:'5'}},false)?.promptTokens,null);
  assert.equal(estimateUsageCost('p','m',end,undefined),null);
  const price=estimateUsageCost('p','m',end,JSON.stringify({'p:m':{inputPerMillion:1,outputPerMillion:2,cachedInputPerMillion:0.5,cacheWritePerMillion:1.5,currency:'USD',version:'test'}}));
  assert.equal(price?.amount,29/1e6);
  const original=global.fetch;let usage:any,body:any;
  try{
    global.fetch=async(_url,init)=>{body=JSON.parse(String(init?.body));return new Response('data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":3}}\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});};
    let text='';for await(const chunk of streamProvider({id:'groq',model:'test',name:'test',baseUrl:'https://example.com',apiKey:'test',priority:1,isRateLimitedUntil:0},[],{onUsage:v=>{usage=v;}}))text+=chunk;
    assert.equal(text,'hello');assert.equal(usage.promptTokens,12);assert.equal(body.stream_options.include_usage,true);
    usage=undefined;global.fetch=async()=>new Response('data: {"usage":{"prompt_tokens":12,"completion_tokens":3}}\n\n',{headers:{'content-type':'text/event-stream'}});
    await assert.rejects(async()=>{for await(const _ of streamProvider({id:'groq',model:'test',name:'test',baseUrl:'https://example.com',priority:1,isRateLimitedUntil:0},[],{onUsage:v=>{usage=v;}})){}},/before completion/);
    assert.equal(usage,undefined);
  }finally{global.fetch=original;}
  const edges=repositoryDependencies([
    {path:'src/a.ts',content:"import './b';"},{path:'src/b.ts',content:''},
    {path:'pkg/a.py',content:'from .b import value'},{path:'pkg/b.py',content:''},
    {path:'src/lib.rs',content:'mod feature;'},{path:'src/feature.rs',content:''},
    {path:'src/a.cpp',content:'#include "a.h"'},{path:'src/a.h',content:''},
    {path:'app/a.rb',content:"require_relative 'b'"},{path:'app/b.rb',content:''},
    {path:'go.mod',content:'module example.org/app'},{path:'main.go',content:'import "example.org/app/core"'},{path:'core/core.go',content:''},
    {path:'Main.java',content:'import app.Service;'},{path:'app/Service.java',content:'package app;'},
    {path:'App.cs',content:'using Example;'},{path:'Example.cs',content:'namespace Example {'},
  ]);
  for(const [source,target] of [['src/a.ts','src/b.ts'],['pkg/a.py','pkg/b.py'],['src/lib.rs','src/feature.rs'],['src/a.cpp','src/a.h'],['app/a.rb','app/b.rb'],['main.go','core/core.go'],['Main.java','app/Service.java'],['App.cs','Example.cs']])
    assert.ok(edges.some(e=>e.source===source&&e.target===target),`${source} -> ${target}`);
}
