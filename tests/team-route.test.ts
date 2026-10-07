import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {TeamError} from '../backend/src/services/team-store';
import {DeviceError} from '../backend/src/services/device-protocol';
export async function testTeamRoute(){
 class RequestError extends Error{constructor(message:string,readonly status:number){super(message);}}
 let authenticated=false,tenantAllowed=true,sends=0,mutations=0,emailFails=false;
 const env={...process.env},exports:any={};
 class Store{
  async invite(org:string,user:string,email:string,role:string){assert.equal(org,'trusted-org');assert.equal(user,'user');assert.equal(email,'invitee@example.test');assert.equal(role,'viewer');mutations++;return {invitation:{id:'invite',email,role,expires_at:'fixture'},token:'a'.repeat(64)};}
  async mutate(org:string,user:string,body:any){assert.equal(org,'trusted-org');assert.equal(user,'user');assert.equal(body.action,'remove');mutations++;return {success:true};}
  async accept(user:string,email:string,confirmed:boolean,token:string){assert.equal(user,'user');assert.equal(email,'account@example.test');assert.equal(confirmed,true);assert.equal(token,'b'.repeat(64));mutations++;return {accepted:true};}
  async switchOrganization(user:string,org:string){assert.equal(user,'user');assert.equal(org,'selected-org');return {success:true};}
 }
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/app/api/team/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Buffer,URL,process:{env},require(name:string){
  if(name==='next/server')return {NextResponse:{json:(body:any,init:any)=>({body,status:init?.status||200,headers:init?.headers})}};
  if(name==='next/headers')return {cookies:async()=>({})};
  if(name==='@/utils/supabase/server')return {createClient:()=>({auth:{getUser:async()=>({data:{user:authenticated?{id:'user',email:'account@example.test',email_confirmed_at:'fixture'}:null},error:null})}})};
  if(name==='@/utils/tenant-context')return {RequestError,requireTenant:async()=>{if(!tenantAllowed)throw new RequestError('Access denied.',403);return {organizationId:'trusted-org'};}};
  if(name==='@/utils/device-ingestion')return {boundedDeviceBody:async(r:Request,max:number)=>{const b=Buffer.from(await r.text());if(b.length>max)throw new DeviceError('Too large.',413);return b;}};
  if(name==='@/utils/direct-db')return {getDirectDbPool:()=>({})};
  if(name.endsWith('/team-store'))return {TeamStore:Store,TeamError};if(name.endsWith('/device-protocol'))return {DeviceError};
  if(name.endsWith('/smtp'))return {sendSmtpMail:async(mail:any)=>{sends++;assert.equal(mail.to,'invitee@example.test');assert.ok(mail.text.includes('https://app.example.test/team#invite='));if(emailFails)throw new Error('private mail detail');return 'fixture-message';}};
  throw new Error(name);
 }});
 const post=(body:any)=>exports.POST(new Request('http://fixture.test',{method:'POST',body:JSON.stringify(body)}));
 assert.equal((await post({action:'invite'})).status,401);assert.equal(mutations,0);authenticated=true;
 const invite={action:'invite',email:'invitee@example.test',role:'viewer',organizationId:'untrusted',sendEmail:false};
 const created=await post(invite);assert.equal(created.status,200);assert.equal(created.body.delivery,'not_requested');assert.equal(sends,0);assert.equal(created.headers['Cache-Control'],'no-store');
 tenantAllowed=false;assert.equal((await post({...invite,action:'remove'})).status,403);await post({action:'accept',token:'b'.repeat(64)});tenantAllowed=true;
 env.RYVIX_PUBLIC_URL='https://app.example.test';env.RYVIX_NOTIFICATION_FROM='sender@example.test';
 assert.equal((await post({...invite,sendEmail:true})).body.delivery,'accepted');emailFails=true;const unknown=await post({...invite,sendEmail:true});assert.equal(unknown.body.delivery,'unknown');assert.ok(!JSON.stringify(unknown.body).includes('private mail detail'));
 env.RYVIX_PUBLIC_URL='http://bad.example.test';assert.equal((await post({...invite,sendEmail:true})).status,503);
 assert.equal((await post({action:'switch',organizationId:'selected-org'})).status,200);
}
