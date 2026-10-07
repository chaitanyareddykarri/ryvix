import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
export async function testGoogleMiddleware(){
 let authenticated=false;
 const exports:any={};
 const response=(url?:URL)=>{const values:any[]=[];return {url:url?.toString(),headers:{set(){}},cookies:{set:(...args:any[])=>values.push(args.length===1?args[0]:{name:args[0],value:args[1],...args[2]}),getAll:()=>values}};};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/utils/supabase/middleware.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,process:{env:{}},console,require(name:string){
  if(name==='next/server')return {NextResponse:{next:()=>response(),redirect:(url:URL)=>response(url)}};
  if(name==='@supabase/ssr')return {createServerClient:(_url:any,_key:any,options:any)=>({auth:{getUser:async()=>{options.cookies.setAll([{name:'session',value:'refreshed-fixture',options:{httpOnly:true}}]);return {data:{user:authenticated?{id:'user'}:null}};}}})};throw new Error(name);
 }});
 const call=(path:string)=>{const url=new URL('https://app.example.test'+path);return exports.updateSession({headers:{},cookies:{getAll:()=>[],set(){}},nextUrl:{pathname:url.pathname,clone:()=>new URL(url)}});};
 assert.equal((await call('/auth/callback?code=fixture')).url,undefined);
 assert.equal((await call('/auth/error?reason=workspace')).url,undefined);
 let result=await call('/dashboard?code=private');assert.equal(result.url,'https://app.example.test/login');assert.equal(result.cookies.getAll()[0].value,'refreshed-fixture');
 authenticated=true;result=await call('/login?code=private');assert.equal(result.url,'https://app.example.test/dashboard');assert.equal(result.cookies.getAll()[0].value,'refreshed-fixture');
 assert.equal((await call('/auth/error?reason=workspace')).url,undefined);
}
