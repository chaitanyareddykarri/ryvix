import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

export async function testGoogleAuth(){
 let exchangeError=false,userPresent=true,profilePresent=true,memberPresent=true,exchanges=0;
 const written:any[]=[];const filters:any[]=[];const exports:any={};
 const db={auth:{exchangeCodeForSession:async(code:string)=>{assert.equal(code,'fixture-code');exchanges++;written.push(['session','fixture']);return {error:exchangeError?{}:null};},getUser:async()=>({data:{user:userPresent?{id:'user'}:null},error:null})},from:(table:string)=>{
  const q:any={select:()=>q,eq:(column:string,value:string)=>{filters.push([table,column,value]);return q;},maybeSingle:async()=>({data:table==='profiles'?(profilePresent?{organization_id:'org'}:null):(memberPresent?{role:'owner'}:null),error:null})};return q;
 }};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/app/auth/callback/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,URL,process:{env:{NODE_ENV:'production',RYVIX_PUBLIC_URL:'https://app.example.test'}},require(name:string){
  if(name==='next/server')return {NextResponse:{redirect:(url:URL)=>({url:url.toString(),headers:{set(){}}}),json:()=>({status:503})}};
  if(name==='next/headers')return {cookies:async()=>({getAll:()=>written})};
  if(name==='@/utils/supabase/server')return {createClient:()=>db};throw new Error(name);
 }});
 const call=(query:string)=>exports.GET(new Request('https://untrusted-host.test/auth/callback'+query));
 assert.equal((await call('?error=access_denied&error_description=secret')).url,'https://app.example.test/auth/error?reason=cancelled');assert.equal(exchanges,0);
 assert.equal((await call('')).url,'https://app.example.test/auth/error?reason=callback');
 assert.equal((await call('?code=fixture-code&next=https://attacker.test')).url,'https://app.example.test/dashboard');
 assert.ok(filters.some(x=>x[0]==='profiles'&&x[1]==='id'&&x[2]==='user'));
 assert.ok(filters.some(x=>x[0]==='organization_members'&&x[1]==='user_id'&&x[2]==='user'));
 assert.ok(filters.some(x=>x[0]==='organization_members'&&x[1]==='organization_id'&&x[2]==='org'));
 assert.equal(written.length,1);
 exchangeError=true;assert.ok((await call('?code=fixture-code')).url.endsWith('reason=callback'));exchangeError=false;
 userPresent=false;assert.ok((await call('?retry=1')).url.endsWith('reason=session'));userPresent=true;
 profilePresent=false;assert.ok((await call('?retry=1')).url.endsWith('reason=workspace'));profilePresent=true;
 memberPresent=false;assert.ok((await call('?retry=1')).url.endsWith('reason=workspace'));memberPresent=true;
 assert.ok((await call('?retry=1')).url.endsWith('/dashboard'));
}
