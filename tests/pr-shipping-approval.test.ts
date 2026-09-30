import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import crypto from 'node:crypto';

export async function testPrShippingApproval() {
  let mode='success'; let requests=0; let credentials=0;
  const calls:string[]=[];
  const taskId=crypto.randomUUID();
  const client={release(){calls.push('release');},async query(sql:string){
    calls.push(sql);
    if(sql.includes('SELECT t.*')) return {rows:[{id:taskId,project_id:'project',active_plan_id:'plan',status:'awaiting_approval',user_prompt:'fix'}]};
    if(sql.includes('SELECT pr.*')) return {rows:mode==='existing'?[{pr_number:7,html_url:'https://github.com/acme/app/pull/7',branch_name:'branch',full_name:'acme/app'}]:[]};
    if(sql.includes('SELECT a.*')) return {rows:[{repository_id:'repo',full_name:'acme/app',base_branch:'main',base_commit_sha:'a'.repeat(40),files:[{filename:'a.ts',action:'modify',content:'new'}]}]};
    if(sql.includes('UPDATE plans')) return {rows:[{id:'plan'}],rowCount:1};
    if(sql.includes('SELECT t.id')) return {rows:mode==='revoked'?[]:[{id:taskId}],rowCount:mode==='revoked'?0:1};
    return {rows:[],rowCount:1};
  }};
  const exports:any={};
  const source=ts.transpileModule(fs.readFileSync('web/app/api/tasks/[taskId]/ship/route.ts','utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  class RequestError extends Error { constructor(message:string,readonly status:number){super(message);} }
  vm.runInNewContext(source,{exports,require(name:string){
    if(name==='next/server')return {NextResponse:{json:(body:unknown,init?:{status:number})=>({body,status:init?.status||200})}};
    if(name==='node:crypto')return crypto;
    if(name==='@/utils/tenant-context')return {RequestError,requireTenant:async()=>({user:{id:'user'},organizationId:'org',role:'developer'}),requireOperator:()=>{}};
    if(name==='@/utils/direct-db')return {getDirectDbPool:()=>({connect:async()=>client})};
    if(name==='@/utils/github-credentials')return {githubTokenForProject:async()=>{credentials++;return 'test-transport-token';}};
    if(name.endsWith('/pr.service'))return {PullRequestService:{createPullRequest:async(params:any)=>{
      requests++;
      const commit=calls.indexOf('COMMIT');
      assert.ok(commit>calls.findIndex(sql=>sql.includes('UPDATE plans')),'Approval must be committed before external writes');
      assert.ok(calls.slice(commit+1).some(sql=>sql.includes('FOR UPDATE OF t')),'Recheck task/tenant after committing approval');
      assert.ok(calls.slice(0,commit).some(sql=>sql.includes('github.create_pr.requested')),'Durable intent precedes GitHub');
      await params.authorization.recordAudit({action:'github.create_pr',status:'requested'});
      if(mode==='github-failure')throw new Error('GitHub request failed');
      return {prNumber:7,prUrl:'https://github.com/acme/app/pull/7',branchName:'branch',title:'fix',commitSha:'b'.repeat(40)};
    }}};
    throw new Error(name);
  }});
  for(mode of ['success','github-failure','revoked','existing']) {
    calls.length=0; requests=0; credentials=0;
    const response=await exports.POST({}, {params:Promise.resolve({taskId})});
    assert.equal(response.status,mode==='github-failure'?502:mode==='revoked'?409:200);
    assert.equal(requests,['success','github-failure'].includes(mode)?1:0);
    if(mode==='github-failure')assert.ok(calls.indexOf('COMMIT')<calls.indexOf('ROLLBACK'));
    if(mode==='existing')assert.equal(credentials,0,'Existing PR reconciliation does not require renewed credentials');
  }
}
