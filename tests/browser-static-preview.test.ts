import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectStaticPreview,previewPath} from '../web/utils/static-preview';
test('snapshot overlays edited files and fetches unchanged dependencies at supplied base',async()=>{
 const base:Record<string,string>={'index.html':'<link rel="stylesheet" href="css/style.css"><script src="js/app.js"></script>','css/style.css':'body {color:red}','js/app.js':'old'};
 const requested:string[]=[];
 const result=await collectStaticPreview([{filename:'js/app.js',action:'modify',content:'new'}],async path=>{requested.push(path);return base[path];});
 assert.equal(result['js/app.js'],'new');assert.equal(result['css/style.css'],base['css/style.css']);assert.deepEqual(requested,['index.html','css/style.css']);
});
test('snapshot rejects missing/deleted entry, oversized files and traversal',async()=>{
 await assert.rejects(collectStaticPreview([{filename:'index.html',action:'delete'}],async()=>''));
 await assert.rejects(collectStaticPreview([],async()=> 'a'.repeat(300001)));
 for(const path of ['../secret.js','https://evil.test/a.js','//evil.test/a.js','a/../../secret.js','file.js?x','a\\b.js'])assert.equal(previewPath(path),null);
 assert.equal(previewPath('./css/style.css'),'css/style.css');
});
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
test('snapshot endpoint denies access before credentials and pins GitHub revision',async()=>{
 class RequestError extends Error{constructor(message:string,readonly status:number){super(message);}}
 let auth=false,role='developer',found=true,credentials=0;
 const exports:any={};
 const artifact={project_id:'project',full_name:'owner/repo',base_commit_sha:'a'.repeat(40),files:[]};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/app/api/tasks/[taskId]/browser-preview/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
 exports,Buffer,AbortSignal,fetch:async(url:string)=>{assert.ok(url.endsWith('?ref='+artifact.base_commit_sha));return Response.json({type:'file',encoding:'base64',size:13,content:Buffer.from('<h1>Test</h1>').toString('base64')});},require(name:string){
 if(name==='next/server')return {NextResponse:{json:(body:any,init:any)=>({body,status:init?.status||200,headers:init?.headers})}};
 if(name==='@/utils/tenant-context')return {RequestError,requireTenant:async()=>{if(!auth)throw new RequestError('Sign in',401);return {user:{id:'user'},organizationId:'org',role};},requireOperator:(r:string)=>{if(r==='viewer')throw new RequestError('Denied',403);}};
 if(name==='@/utils/direct-db')return {getDirectDbPool:()=>({query:async(sql:string,args:string[])=>{assert.equal(args[1],'org');assert.equal(args[2],'user');assert.match(sql,/r.project_id=t.project_id/);assert.match(sql,/p.organization_id=\$2/);return {rows:found?[artifact]:[]};}})};
 if(name==='@/utils/github-credentials')return {githubTokenForProject:async()=>{credentials++;return 'fixture-private-token';}};
 if(name==='@/utils/static-preview')return {collectStaticPreview};throw Error(name);
 }});
 const call=()=>exports.GET(new Request('https://fixture.test'),{params:Promise.resolve({taskId:'11111111-1111-4111-8111-111111111111'})});
 assert.equal((await call()).status,401);auth=true;role='viewer';assert.equal((await call()).status,403);
 role='developer';found=false;assert.equal((await call()).status,404);assert.equal(credentials,0);
 found=true;const response=await call();assert.equal(response.status,200);assert.equal(response.body.files['index.html'],'<h1>Test</h1>');assert.equal(response.headers['Cache-Control'],'private, no-store');assert.ok(!JSON.stringify(response).includes('fixture-private-token'));
});
