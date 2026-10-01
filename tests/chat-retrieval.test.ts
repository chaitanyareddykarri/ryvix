import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { ContextBuilder } from '../ai/src/context/context-builder';

export async function testChatRetrieval() {
  const exports: any = {};
  let queries=0;
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/utils/chat-retrieval.ts','utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText,{exports,require(name:string){
    if(name==='server-only') return {};
    if(name.endsWith('/context-builder')) return {ContextBuilder};
    if(name==='./direct-db') return {queryDirectDb:async(sql:string,args:unknown[])=>{
      queries++;
      assert.ok(sql.includes('p.organization_id=$1') && sql.includes('m.user_id=$2'));
      assert.equal(args[0],'verified-org');assert.equal(args[1],'verified-user');
      if(sql.includes('FROM incidents')) return [{id:'incident-1',title:'Database timeout',ai_diagnosis:'Connection pool unavailable',created_at:'2026-10-01'}];
      return [{task_id:'task-1',filename:'.env',content:'excluded'},
        ...Array.from({length:8},(_,i)=>({task_id:'task-1',filename:`docs/database-${i}.md`,content:'x'.repeat(10000)}))];
    }};
    throw new Error(name);
  }});
  assert.equal((await exports.retrieveChatSources('verified-org','verified-user','what is this')).length,0);
  assert.equal(queries,0);
  const sources=await exports.retrieveChatSources('verified-org','verified-user','explain database timeout');
  assert.equal(queries,2);
  assert.ok(!sources.some((source:any)=>source.title==='.env'));
  assert.ok(sources.some((source:any)=>source.title.endsWith('.md')));
  assert.ok(sources.reduce((sum:number,source:any)=>sum+source.excerpt.length,0)<=16000);
  assert.ok(sources.some((source:any)=>source.kind.includes('not current branch')));
}
