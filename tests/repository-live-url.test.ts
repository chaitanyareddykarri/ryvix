import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {DeviceError,digest} from '../backend/src/services/device-protocol';
export async function testRepositoryLiveUrl(){
 class RequestError extends Error{constructor(message:string,readonly status:number){super(message);}}
 let role='viewer',found=true,auditFailure=false,stored:string|null=null;
 const calls:string[]=[];const exports:any={};
 const client={release(){},async query(sql:string,args:any[]=[]){calls.push(sql);
  if(sql.includes('FROM organization_members')){assert.deepEqual(Array.from(args),['org','user']);return {rows:[{role}]};}
  if(sql.includes('FROM repositories')){assert.equal(args[1],'org');assert.ok(sql.includes('p.organization_id=$2'));return {rows:found?[{live_url:stored}]:[]};}
  if(sql.startsWith('UPDATE'))stored=args[1];
  if(sql.includes('INSERT INTO organization_audit_events')){assert.ok(sql.includes('actor_id,action_name'));if(auditFailure)throw new Error('private database detail');}
  return {rows:[]};
 }};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/app/api/github/repositories/live-url/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Buffer,URL,require(name:string){
  if(name==='next/server')return {NextResponse:{json:(body:any,init:any)=>({body,status:init?.status||200,headers:init?.headers})}};
  if(name==='@/utils/tenant-context')return {RequestError,requireTenant:async()=>({organizationId:'org',user:{id:'user'},role}),requireOperator:(r:string)=>{if(!['owner','admin','developer'].includes(r))throw new RequestError('Operator required.',403);}};
  if(name==='@/utils/device-ingestion')return {boundedDeviceBody:async(r:Request,max:number)=>{const b=Buffer.from(await r.text());if(b.length>max)throw new DeviceError('Too large.',413);return b;}};
  if(name==='@/utils/direct-db')return {getDirectDbPool:()=>({connect:async()=>client})};
  if(name.endsWith('device-protocol'))return {DeviceError,digest};throw new Error(name);
 }});
 const id='11111111-1111-4111-8111-111111111111';
 const post=(liveUrl:any)=>exports.POST(new Request('http://fixture.test',{method:'POST',body:JSON.stringify({repositoryId:id,liveUrl,organizationId:'attacker'})}));
 assert.equal((await post('https://example.test')).status,403);assert.equal(calls.length,0);role='developer';
 for(const url of ['javascript:alert(1)','https://user:pass@example.test','bad','x'.repeat(5000)])assert.ok((await post(url)).status>=400);
 const saved=await post('https://example.test/path');assert.equal(saved.body.liveUrl,'https://example.test/path');assert.equal(saved.headers['Cache-Control'],'no-store');
 assert.equal((await exports.GET(new Request(`http://fixture.test?repositoryId=${id}`))).body.liveUrl,stored);
 assert.equal((await post(null)).body.liveUrl,null);
 found=false;assert.equal((await post('https://example.test')).status,404);found=true;
 auditFailure=true;const denied=await post('https://example.test');assert.equal(denied.status,503);assert.ok(!JSON.stringify(denied).includes('private database detail'));assert.equal(calls.at(-1),'ROLLBACK');
}
