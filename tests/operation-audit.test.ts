import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';

export async function testOperationAudit() {
  let allowed = true, failAudit = false; const calls: string[] = [];
  const exports: any = {};
  const client = {release(){},query:async(sql:string)=>{
    calls.push(sql);
    if(sql.includes('SELECT m.role'))return {rows:allowed?[{role:'developer'}]:[]};
    if(sql.includes('INSERT INTO audit_events')&&failAudit)throw new Error('Storage failed');
    return {rows:[]};
  }};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/utils/operation-access.ts','utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText,{exports,require(name:string){
    if(name==='node:crypto')return crypto;
    if(name==='./direct-db')return {getDirectDbPool:()=>({connect:async()=>client})};
    throw new Error(name);
  }});
  const query:any={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:{id:'project',organization_id:'org',role:'developer'}})};
  const db={from:()=>query};
  const auth=exports.operationAuthorization(db,'user','project');
  const event={action:'workspace.execute',target:'workspace',status:'requested'};
  await auth.recordAudit(event);assert.ok(calls.includes('COMMIT'));
  allowed=false;calls.length=0;await assert.rejects(auth.recordAudit(event));
  assert.ok(!calls.some(sql=>sql.includes('INSERT INTO audit_events')));assert.ok(calls.includes('ROLLBACK'));
  allowed=true;failAudit=true;calls.length=0;await assert.rejects(auth.recordAudit(event));
  assert.ok(!calls.includes('COMMIT'));assert.ok(calls.includes('ROLLBACK'));
}
