import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {normalizeWhatsAppPhone} from '../backend/src/services/whatsapp-phone';
import {ChannelError} from '../backend/src/services/channel-inbox';
import {DeviceError} from '../backend/src/services/device-protocol';

export async function testProfileContact(){
  class RequestError extends Error {constructor(message:string,readonly status:number){super(message);}}
  let denied=true,fail=false,number:string|null=null,calls=0;
  const filters:Record<string,string>={};
  const query:any={eq:(key:string,value:string)=>{filters[key]=value;return query;},select:()=>query,single:async()=>{
    assert.equal(filters.id,'signed-in-user');assert.equal(filters.organization_id,'verified-org');
    return {data:fail?null:{phone_number:number},error:fail?{message:'private db detail'}:null};
  }};
  const db={from:(table:string)=>{calls++;assert.equal(table,'profiles');return {select:()=>query,update:(value:any)=>{assert.deepEqual(Object.keys(value),['phone_number']);number=value.phone_number;return query;}};}};
  const exports:any={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/app/api/profile/contact/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Buffer,require(name:string){
    if(name==='next/server')return {NextResponse:{json:(body:any,init:any)=>({body,status:init?.status||200,headers:init?.headers})}};
    if(name==='@/utils/tenant-context')return {RequestError,requireTenant:async()=>{if(denied)throw new RequestError('Authentication required.',401);return {db,user:{id:'signed-in-user'},organizationId:'verified-org'};}};
    if(name==='@/utils/device-ingestion')return {boundedDeviceBody:async(request:Request,max:number)=>{const value=Buffer.from(await request.text());if(value.length>max)throw new DeviceError('Request too large.',413);return value;}};
    if(name.endsWith('/whatsapp-phone'))return {normalizeWhatsAppPhone};
    if(name.endsWith('/channel-inbox'))return {ChannelError};
    if(name.endsWith('/device-protocol'))return {DeviceError};
    throw new Error(name);
  }});
  const post=(body:unknown)=>exports.POST(new Request('http://fixture.test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
  assert.equal((await exports.GET()).status,401);assert.equal((await post({action:'save',phone:'+15555550123'})).status,401);assert.equal(calls,0);
  denied=false;assert.equal((await exports.GET()).body.phoneNumber,null);
  const saved=await post({action:'save',phone:'+1 (555) 555-0123',userId:'other-user',organizationId:'other-org'});
  assert.equal(saved.status,200);assert.equal(saved.body.phoneNumber,'+15555550123');assert.equal(saved.headers['Cache-Control'],'no-store');
  assert.equal((await exports.GET()).body.phoneNumber,'+15555550123');
  for(const phone of [null,'123','+0123456789','+123\n456789'])assert.equal((await post({action:'save',phone})).status,400);
  assert.equal((await post({action:'verify',phone:'+15555550123'})).status,400);
  assert.equal((await post({action:'save',phone:'x'.repeat(1100)})).status,413);
  fail=true;const unavailable=await exports.GET();assert.equal(unavailable.status,503);assert.ok(!JSON.stringify(unavailable.body).includes('private db detail'));
}
