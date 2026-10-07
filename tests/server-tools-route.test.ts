import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {ServerAccessManager} from '../ai/src/server-access-manager';
import {ServerClassifier} from '../ai/src/server-classifier';
import {DeviceError,digest} from '../backend/src/services/device-protocol';
export async function testServerToolsRoute(){
 class RequestError extends Error{constructor(message:string,readonly status:number){super(message);}}
 let denied=true,role='viewer',auditFailure=false,found=true;const queries:string[]=[];const exports:any={};
 const pool={async query(sql:string,args:any[]){queries.push(sql);if(sql.includes('FROM servers')){assert.equal(JSON.stringify(args),JSON.stringify(['org','user','11111111-1111-4111-8111-111111111111']));assert.ok(sql.includes('p.organization_id=$1')&&sql.includes('m.user_id=$2'));return {rows:found?[{hostname:'db',services:[{name:'postgresql'}]}]:[]};}if(auditFailure)throw new Error('Private database detail');assert.equal(args.length,3);return {rows:[]};}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/app/api/servers/tools/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Buffer,require(name:string){
  if(name==='next/server')return {NextResponse:{json:(body:any,init:any)=>({body,status:init?.status||200,headers:init?.headers})}};
  if(name==='@/utils/tenant-context')return {RequestError,requireTenant:async()=>{if(denied)throw new RequestError('Authentication required.',401);return {organizationId:'org',user:{id:'user'},role};},requireOperator:(r:string)=>{if(!['owner','admin','developer'].includes(r))throw new RequestError('Operator required.',403);}};
  if(name==='@/utils/device-ingestion')return {boundedDeviceBody:async(r:Request,max:number)=>{const b=Buffer.from(await r.text());if(b.length>max)throw new DeviceError('Too large.',413);return b;}};
  if(name==='@/utils/direct-db')return {getDirectDbPool:()=>pool};
  if(name.endsWith('device-protocol'))return {DeviceError,digest};if(name.endsWith('server-access-manager'))return {ServerAccessManager};if(name.endsWith('server-classifier'))return {ServerClassifier};throw new Error(name);
 }});
 const post=(body:any)=>exports.POST(new Request('http://fixture.test',{method:'POST',body:JSON.stringify(body)}));
 assert.equal((await post({action:'generate_key',label:'fixture'})).status,401);assert.equal(queries.length,0);
 denied=false;assert.equal((await post({action:'generate_key',label:'fixture'})).status,403);role='admin';
 const generated=await post({action:'generate_key',label:'fixture'});assert.equal(generated.status,200);assert.equal(generated.headers['Cache-Control'],'no-store');assert.ok(generated.body.privateKey.includes('BEGIN OPENSSH PRIVATE KEY'));
 auditFailure=true;const failed=await post({action:'generate_key',label:'fixture'});assert.equal(failed.status,503);assert.ok(!JSON.stringify(failed.body).includes('PRIVATE KEY'));auditFailure=false;
 const classified=await post({action:'classify',serverId:'11111111-1111-4111-8111-111111111111',organizationId:'other'});assert.equal(classified.body.features.archetype,'DATABASE_HOST');
 found=false;assert.equal((await post({action:'classify',serverId:'11111111-1111-4111-8111-111111111111'})).status,404);
 assert.equal((await post({action:'diagnose',accessType:'bad',errorOutput:'test'})).status,400);assert.equal((await post({action:'diagnose',accessType:'SSH_CREDENTIAL',errorOutput:'x'.repeat(17000)})).status,413);
}
