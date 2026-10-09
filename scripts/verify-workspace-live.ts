import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
function gatewayRequest(path:string,host:string,cookie?:string):Promise<Response>{
 return new Promise((resolve,reject)=>{const req=httpRequest({hostname:'127.0.0.1',port:18081,path,headers:{host,...(cookie?{cookie}:{})}},res=>{
 const chunks:Buffer[]=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{const headers=new Headers();for(const [name,value] of Object.entries(res.headers))if(value)headers.set(name,Array.isArray(value)?value.join('; '):value);resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers}));});});req.on('error',reject);req.end();});
}

async function main() {
  const image=process.env.RYVIX_WORKSPACE_NODE_IMAGE;
  if(!image || !process.env.RYVIX_WORKSPACE_EGRESS_IMAGE) throw new Error('Configure RYVIX_WORKSPACE_NODE_IMAGE and RYVIX_WORKSPACE_EGRESS_IMAGE before this opt-in Docker test');
  process.env.RYVIX_WORKSPACE_IMAGES=[process.env.RYVIX_WORKSPACE_IMAGES,image,process.env.RYVIX_WORKSPACE_EGRESS_IMAGE].filter(Boolean).join(',');
  const {dockerWorkspaceManager:manager,DockerWorkspaceManager,runDocker}=await import('../services/src/workspace/docker-workspace.manager');
  const {ensurePreviewGateway,signPreviewGrant}=await import('../services/src/workspace/preview-gateway');
  process.env.PREVIEW_SIGNING_SECRET=randomBytes(32).toString('hex');
  process.env.PREVIEW_BASE_DOMAIN='preview.example.test';
  process.env.RYVIX_PUBLIC_URL='https://app.example.test';
  process.env.PREVIEW_GATEWAY_PORT='18081';
  process.env.RYVIX_WORKSPACE_MAX_SESSIONS='1';
  process.env.RYVIX_WORKSPACE_MEMORY_BUDGET_MB='4608';
  process.env.RYVIX_WORKSPACE_CPU_BUDGET='2';
  const session=await manager.createSession({taskId:randomUUID(),projectId:randomUUID(),baseImage:image});
  try {
    assert.equal(await manager.hasCapacity(),false);
    await assert.rejects(manager.createSession({taskId:randomUUID(),projectId:randomUUID(),baseImage:image}),/capacity exhausted/);
    console.log('PASS: actual Docker inventory blocks a second session while existing allocation is retained');
    const inspection=await runDocker(['inspect',session.container_id],10000);
    const actual=JSON.parse(inspection.stdout)[0];
    assert.equal(actual.Config.User,'1000:1000');
    assert.equal(actual.HostConfig.ReadonlyRootfs,true);
    assert.ok(actual.HostConfig.CapDrop.includes('ALL'));
    assert.equal(actual.HostConfig.Privileged,false);
    assert.ok(!JSON.stringify(actual.Mounts).includes('docker.sock'));
    console.log('PASS: real non-root, read-only, capability-stripped container');
    await manager.applyDiff(session.id,'src/check.txt','original\n');
    assert.equal(await manager.readFile(session.id,'src/check.txt'),'original\n');
    await assert.rejects(manager.readFile(session.id,'../etc/passwd'));
    const symlink=await manager.executeCommand(session.id,'ln -s /tmp src/link');
    assert.equal(symlink.success,true);
    await assert.rejects(manager.applyDiff(session.id,'src/link/escape','blocked'));
    console.log('PASS: real file read/write and symlink/path traversal rejection');
    const git=await manager.executeCommand(session.id,"rm src/link && git init && git config user.name Verification && git config user.email verification@example.test && git add src/check.txt && git commit -m fixture");
    assert.equal(git.success,true,git.stderr);
    await manager.applyDiff(session.id,'src/check.txt','changed\n');
    const files=await manager.captureDiff(session.id);
    assert.equal(files.length,1);
    assert.equal(files[0].filename,'src/check.txt');
    assert.equal(files[0].additions,1);
    assert.equal(files[0].deletions,1);
    console.log('PASS: actual Git diff capture and measured line counts');
    const network=await manager.executeCommand(session.id,`node -e "fetch('https://example.com',{signal:AbortSignal.timeout(2000)}).then(()=>process.exit(1)).catch(()=>process.exit(0))"`,20000);
    assert.equal(network.exitCode,0);
    console.log('PASS: default sandbox outbound network blocked');
    await manager.withRestrictedEgress(session.id,async()=>{
      const install=await manager.executeCommand(session.id,'npm view is-number@7.0.0 version --fetch-retries=0 --fetch-timeout=15000',25000);
      assert.equal(install.success,true,install.stderr);
      assert.equal(install.stdout.trim(),'7.0.0');
      const denied=await manager.executeCommand(session.id,`node -e "const u=new URL(process.env.HTTPS_PROXY);const r=require('http').request({host:u.hostname,port:u.port,method:'CONNECT',path:'169.254.169.254:443'});r.on('connect',(s,c)=>{c.destroy();process.exit(s.statusCode===403?0:1)});r.on('error',()=>process.exit(1));r.end()"`,10000);
      assert.equal(denied.success,true,denied.stderr);
      const blocked=await manager.executeCommand(session.id,`node -e "fetch('https://example.com',{signal:AbortSignal.timeout(2000)}).then(()=>process.exit(1)).catch(()=>process.exit(0))"`,10000);
      assert.equal(blocked.success,true);
    });
    assert.notEqual((await runDocker(['inspect',`${session.container_id}_egress`],10000)).exitCode,0);
    console.log('PASS: real registry access through broker, metadata/direct outbound rejection and broker removal');
    await ensurePreviewGateway();
    await manager.startPreview(session.id,`node -e "require('http').createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end('<h1>Verified sandbox</h1>')}).listen(3000,'0.0.0.0')"`,`https://${session.id}.preview.example.test`);
    const host=`${session.id}.preview.example.test`;
    const denied=await gatewayRequest('/',host);
    assert.equal(denied.status,401);
    const launch=await gatewayRequest(`/?__ryvix_grant=${signPreviewGrant(session.id,Date.now()+60000)}`,host);
    assert.equal(launch.status,303);
    const cookie=launch.headers.get('set-cookie')!.split(';')[0];
    const preview=await gatewayRequest('/',host,cookie);
    assert.equal(preview.status,200);
    assert.ok((await preview.text()).includes('Verified sandbox'));
    console.log('PASS: actual app readiness, unsigned denial, grant exchange and preview proxy (HTTP loopback; public TLS not tested)');
  } finally {
    // Simulate recovery after a crash before preview_url was persisted.
    await new DockerWorkspaceManager().cleanupPersistedSession({...session,preview_url:null});
    await manager.terminateSession(session.id);
    const result=await runDocker(['inspect',session.container_id],10000);
    assert.notEqual(result.exitCode,0);
    assert.notEqual((await runDocker(['inspect',`${session.container_id}_preview`],10000)).exitCode,0);
    console.log('PASS: recovered cleanup removes container and unpersisted preview relay');
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
