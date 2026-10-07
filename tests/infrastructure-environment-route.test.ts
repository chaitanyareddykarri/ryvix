import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {DeviceError} from '../backend/src/services/device-protocol';
export async function testInfrastructureEnvironmentRoute(){
 class RequestError extends Error{constructor(message:string,readonly status:number){super(message);}}
 let authenticated=false,role='viewer',called=0,fail=false;const exports:any={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/app/api/environments/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Buffer,require(name:string){
  if(name==='next/server')return {NextResponse:{json:(body:any,init:any)=>({body,status:init?.status||200,headers:init?.headers})}};
  if(name==='@/utils/tenant-context')return {RequestError,requireTenant:async()=>{if(!authenticated)throw new RequestError('Authentication required.',401);return {organizationId:'verified-org',user:{id:'verified-user'},role};},requireOperator:(r:string)=>{if(!['owner','admin','developer'].includes(r))throw new RequestError('Operator permission required.',403);}};
  if(name==='@/utils/device-ingestion')return {boundedDeviceBody:async(request:Request,max:number)=>{const b=Buffer.from(await request.text());if(b.length>max)throw new DeviceError('Too large.',413);return b;}};
  if(name==='@/utils/direct-db')return {getDirectDbPool:()=>({})};
  if(name.endsWith('device-protocol'))return {DeviceError};
  if(name.endsWith('infrastructure-environment'))return {createInfrastructureEnvironment:async(_pool:any,org:string,user:string)=>{called++;assert.equal(org,'verified-org');assert.equal(user,'verified-user');if(fail)throw new Error('private database detail');return {id:'environment'};}};
  throw new Error(name);
 }});
 const post=(body:string)=>exports.POST(new Request('http://fixture.test',{method:'POST',body}));
 assert.equal((await post('{}')).status,401);authenticated=true;
 assert.equal((await post('{}')).status,403);assert.equal(called,0);role='developer';
 assert.equal((await post('invalid')).status,400);assert.equal((await post('x'.repeat(3000))).status,413);assert.equal(called,0);
 const result=await post(JSON.stringify({organizationId:'attacker',userId:'attacker'}));assert.equal(result.status,200);assert.equal(result.headers['Cache-Control'],'no-store');
 fail=true;const error=await post('{}');assert.equal(error.status,503);assert.ok(!JSON.stringify(error).includes('private database detail'));
}
