import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {request} from 'node:http';
async function main(){
  const image=process.env.RYVIX_WORKSPACE_STATIC_IMAGE;
  if(!image)throw Error('Set an already built RYVIX_WORKSPACE_STATIC_IMAGE');
  Object.assign(process.env,{RYVIX_WORKSPACE_MODE:'static',RYVIX_WORKSPACE_IMAGES:image,
    RYVIX_PREVIEW_RELAY_IMAGE:image,RYVIX_WORKSPACE_MAX_SESSIONS:'1',RYVIX_WORKSPACE_MEMORY_BUDGET_MB:'320',
    RYVIX_WORKSPACE_CPU_BUDGET:'0.75',PREVIEW_SIGNING_SECRET:randomBytes(32).toString('hex'),
    PREVIEW_BASE_DOMAIN:'preview.example.test',RYVIX_PUBLIC_URL:'https://app.example.test',PREVIEW_GATEWAY_PORT:'18082'});
  const {dockerWorkspaceManager:manager,runDocker}=await import('../services/src/workspace/docker-workspace.manager');
  const {ensurePreviewGateway,signPreviewGrant}=await import('../services/src/workspace/preview-gateway');
  const {STATIC_CHECK,STATIC_PREVIEW}=await import('../services/src/workspace/static-policy');
  const session=await manager.createSession({taskId:randomUUID(),projectId:randomUUID(),baseImage:image,cpu:0.25,ramMb:192});
  try {
    const inspection=JSON.parse((await runDocker(['inspect',session.container_id],10000)).stdout)[0];
    assert.equal(inspection.HostConfig.Memory,192*1048576);
    assert.equal(inspection.HostConfig.MemorySwap,192*1048576);
    assert.equal(inspection.Config.User,'1000:1000');assert.equal(inspection.HostConfig.ReadonlyRootfs,true);
    assert.ok(inspection.HostConfig.CapDrop.includes('ALL'));assert.equal(inspection.HostConfig.Privileged,false);
    assert.ok(!JSON.stringify(inspection.Mounts).includes('docker.sock'));
    const network=JSON.parse((await runDocker(['network','inspect',`${session.container_id}_net`],10000)).stdout)[0];
    assert.equal(network.Internal,true);
    await manager.prepareStaticSnapshot(session.id,[{path:'index.html',content:'<!doctype html><h1>Before</h1>'},{path:'app.js',content:'throw Error("never execute on server")'}]);
    await manager.applyDiff(session.id,'index.html','<!doctype html><h1>After</h1>');
    assert.equal((await manager.executeCommand(session.id,STATIC_CHECK)).success,true);
    assert.ok((await manager.captureDiff(session.id)).some(file=>file.filename==='index.html'&&file.content?.includes('After')));
    assert.equal(await manager.hasCapacity(),false);
    await assert.rejects(manager.executeCommand(session.id,'npm install'),/disabled/);
    await assert.rejects(manager.withRestrictedEgress(session.id,async()=>{}),/outbound/);
    await ensurePreviewGateway();await manager.startPreview(session.id,STATIC_PREVIEW,`https://${session.id}.preview.example.test`);
    const get=(url:string,cookie?:string)=>new Promise<{status:number;cookie?:string;body:string}>((resolve,reject)=>{
      const req=request({hostname:'127.0.0.1',port:18082,path:url,headers:{host:`${session.id}.preview.example.test`,...(cookie?{cookie}:{})}},res=>{
        let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode!,body,cookie:res.headers['set-cookie']?.[0]?.split(';')[0]}));});req.on('error',reject);req.end();});
    assert.equal((await get('/')).status,401);
    const grant=await get('/?__ryvix_grant='+signPreviewGrant(session.id,Date.now()+30000));assert.equal(grant.status,303);assert.ok(grant.cookie);
    const preview=await get('/',grant.cookie);assert.equal(preview.status,200);assert.match(preview.body,/After/);
    assert.equal((await get('/.git/config',grant.cookie)).status,404);
    console.log('PASS: 192 MiB non-root isolated static snapshot, real diff, syntax-only checks, denied commands/egress, signed preview and single-session admission.');
  } finally {await manager.terminateSession(session.id);}
  assert.equal(await manager.hasCapacity(),true);
  // Exercise the actual task orchestrator with local GitHub/model responses.
  // No provider request, credential, database mutation or remote repository write.
  const originalFetch=globalThis.fetch;
  const source={'index.html':'<!doctype html><h1>Original</h1>','app.js':'console.log("browser only")'};
  const entries=Object.entries(source).map(([name,content],index)=>({path:name,mode:'100644',type:'blob',size:Buffer.byteLength(content),sha:String(index+1).repeat(40)}));
  Object.assign(process.env,{RYVIX_MODEL_PROVIDER:'openai',OPENAI_MODEL:'fixture-model',OPENAI_API_KEY:'fixture-not-real',RYVIX_CHAT_PROVIDER:'openai',RYVIX_MODEL_FALLBACK_ORDER:''});
  let planned=false, completedSession:string|undefined;
  globalThis.fetch=async(url,options)=>{
    const address=String(url);
    if(address.startsWith('http://127.0.0.1:'))return originalFetch(url,options);
    if(address==='https://api.github.com/repos/fixture/static')return Response.json({full_name:'fixture/static',archived:false});
    if(address.includes('/git/ref/heads/'))return Response.json({object:{sha:'a'.repeat(40)}});
    if(address.includes('/git/trees/'))return Response.json({tree:entries,truncated:false});
    if(address.includes('/git/blobs/')){
      const entry=entries.find(e=>address.endsWith(e.sha));if(!entry)throw Error('Unexpected fixture blob');
      return Response.json({encoding:'base64',size:entry.size,content:Buffer.from(source[entry.path as keyof typeof source]).toString('base64')});
    }
    if(address==='https://api.openai.com/v1/chat/completions')return Response.json({choices:[{message:{content:JSON.stringify({summary:'Fixture title change',steps:['Edit title'],changes:[{path:'index.html',action:'modify',content:'<!doctype html><h1>Changed</h1>'}]})}}]});
    throw Error('Unexpected outbound request in static fixture');
  };
  try {
    const {executeRepositoryTask}=await import('../services/src/workspace/repository-task');
    const events:import('../services/src/workspace/task-progress').TaskProgress[]=[];
    const result=await executeRepositoryTask({taskId:randomUUID(),projectId:randomUUID(),fullName:'fixture/static',branch:'main',githubToken:'fixture-not-real',prompt:'Change title',onAttempt:()=>{},
      onProgress:async event=>{events.push(event);},onPlan:async()=>{planned=true;},onSession:async session=>{completedSession=session.id;}});
    assert.equal(planned,true);assert.equal(result.baseSha,'a'.repeat(40));assert.equal(result.previewError,null);
    assert.ok(result.files.some(file=>file.content?.includes('Changed')));
    assert.ok(result.verification.length===1&&result.verification[0].command===STATIC_CHECK&&result.verification[0].success);
    assert.ok(events.some(e=>e.stage==='analysis'&&e.status==='passed'));
    assert.ok(events.some(e=>e.stage==='test'&&e.status==='passed'));
    assert.ok(events.some(e=>e.stage==='build'&&e.status==='skipped'));
    assert.ok(events.some(e=>e.stage==='preview'&&e.status==='passed'));
    console.log('PASS: actual repository-task flow with fixture APIs, bounded snapshot, model changes, syntax verification and preview; no installs/builds or live providers.');
  } finally {globalThis.fetch=originalFetch;if(completedSession)await manager.terminateSession(completedSession);}
  // The verification process owns the loopback gateway; no production worker is started.
}
main().then(()=>process.exit(0),()=>{console.error('Static Docker acceptance failed; inspect local configuration and cleanup.');process.exitCode=1;setTimeout(()=>process.exit(1),100).unref();});
