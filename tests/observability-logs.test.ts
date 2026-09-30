import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
export async function testObservabilityLogs() {
  class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
  let denied = false, failure = false, reads = 0;
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/app/api/observability/logs/route.ts','utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText,{exports,URL,require(name:string){
    if(name==='next/server') return {NextResponse:{json:(body:any,init?:any)=>({body,status:init?.status||200})}};
    if(name==='@/utils/tenant-context')return {RequestError,requireTenant:async()=>{
      if(denied)throw new RequestError('Authentication required',401);
      return {organizationId:'org',user:{id:'user'}};
    }};
    if(name==='@/utils/direct-db')return {queryDirectDb:async(sql:string,args:unknown[])=>{
      reads++;assert.match(sql,/m.user_id=\$2/);assert.match(sql,/p.organization_id=\$1/);
      assert.match(sql,/LIMIT \$4/);assert.doesNotMatch(sql,/raw_evidence|parameters_hash|SELECT \*/);
      assert.equal(args[0],'org');assert.equal(args[1],'user');assert.equal(args[2],'security');assert.equal(args[3],25);
      if(failure)throw new Error('private connection details');
      return [{id:'security-row',type:'SECURITY',severity:'critical',message:'Recorded security event'}];
    }};
    throw new Error(name);
  }});
  const request={url:'https://example.test/api/observability/logs?severity=security&limit=25'};
  denied=true;assert.equal((await exports.GET(request)).status,401);assert.equal(reads,0);
  denied=false;
  assert.equal((await exports.GET({url:'https://example.test?limit=10000'})).status,400);
  assert.equal((await exports.GET({url:'https://example.test?severity=invalid'})).status,400);
  const response=await exports.GET(request);assert.equal(response.status,200);assert.equal(response.body.logs.length,1);
  failure=true;const failed=await exports.GET(request);assert.equal(failed.status,503);
  assert.ok(!JSON.stringify(failed).includes('private connection details'));
}
