import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {ContextBuilder} from '../ai/src/context/context-builder';
export async function testRepositoryChatContext(){
  const exports:any={},calls:string[]=[];let permitted=true,credentials=0;
  class RequestError extends Error {constructor(message:string,readonly status:number){super(message);}}
  const sha='a'.repeat(40),blob='b'.repeat(40),id='11111111-1111-4111-8111-111111111111';
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/utils/repository-chat-context.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,Buffer,AbortSignal,TextDecoder,fetch:async(url:string,init:RequestInit)=>{
      calls.push(url);assert.equal(init.redirect,'error');
      if(url.includes('/commits/'))return Response.json({sha,commit:{committer:{date:'2026-10-01T00:00:00Z'}}});
      if(url.includes('/git/trees/'))return Response.json({tree:[{path:'README.md',type:'blob',mode:'100644',size:100,sha:blob},
        {path:'secrets/README.md',type:'blob',mode:'100644',size:100,sha:blob},{path:'README-link.md',type:'blob',mode:'120000',size:10,sha:blob}]});
      return Response.json({encoding:'base64',content:Buffer.from('Repository notes\npassword="fixture-secret-123"').toString('base64')});
    },require(name:string){
      if(name==='server-only')return {};
      if(name==='./tenant-context')return {RequestError};
      if(name.endsWith('/context-builder'))return {ContextBuilder};
      if(name==='./github-credentials')return {githubTokenForProject:async()=>{credentials++;return 'fixture';}};
      if(name==='./direct-db')return {queryDirectDb:async(sql:string,args:string[])=>{
        assert.ok(sql.includes('p.organization_id=$2')&&sql.includes('m.user_id=$3'));assert.equal(args[1],'org');assert.equal(args[2],'user');
        return permitted?[{project_id:'project',full_name:'fixture/repo',default_branch:'main'}]:[];
      }};
      throw new Error('Unexpected dependency');
    },
  });
  const result=await exports.repositoryChatContext('org','user',id,'Explain README');
  assert.equal(result.commit,sha);assert.equal(result.sources.length,1);assert.ok(result.sources[0].id.includes(sha));
  assert.ok(!result.sources[0].excerpt.includes('fixture-secret-123'));assert.equal(calls.length,3);
  permitted=false;calls.length=0;credentials=0;
  await assert.rejects(exports.repositoryChatContext('org','user',id,'README'),/denied/);
  assert.equal(calls.length,0);assert.equal(credentials,0);
}
