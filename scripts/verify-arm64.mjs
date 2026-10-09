import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const docker = args => execFileSync('docker',args,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']}).trim();
for (const name of ['RYVIX_ARM_WEB_IMAGE','RYVIX_ARM_WORKER_IMAGE','RYVIX_WORKSPACE_NODE_IMAGE','RYVIX_WORKSPACE_EGRESS_IMAGE']) {
  const image=process.env[name];
  assert.ok(image,`${name} required`);
  assert.equal(docker(['image','inspect','--format','{{.Os}}/{{.Architecture}}',image]),'linux/arm64');
  assert.equal(docker(['run','--rm','--platform','linux/arm64','--network','none','--entrypoint','node',image,'-p','process.arch']),'arm64');
}
const app=process.env.RYVIX_ARM_WEB_IMAGE;
docker(['run','--rm','--platform','linux/arm64','--network','none','--entrypoint','node',app,'-e',
  "const sharp=require('module').createRequire('/app/web/server.js')('sharp');sharp({create:{width:1,height:1,channels:3,background:'white'}}).png().toBuffer().then(b=>{if(!b.length)process.exit(1)})"]);
docker(['run','--rm','--platform','linux/arm64','--network','none','--entrypoint','node',app,'-e',
  "const c=require('child_process').spawn(process.execPath,['/app/web/server.js'],{env:{...process.env,HOSTNAME:'127.0.0.1',PORT:'3000',RYVIX_RELEASE_SHA:'arm-runtime-probe'},stdio:'ignore'});(async()=>{try{for(let i=0;i<60;i++){try{const r=await fetch('http://127.0.0.1:3000/api/health',{signal:AbortSignal.timeout(1000)});const b=await r.json();if(r.ok&&b.status==='ok'&&b.revision==='arm-runtime-probe')return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('health');}catch{process.exitCode=1;}finally{c.kill('SIGTERM');}})()"]);
docker(['run','--rm','--platform','linux/arm64','--network','none','--entrypoint','node',process.env.RYVIX_ARM_WORKER_IMAGE,
  '--import','tsx','-e',"require('pg');require('typescript');require('fs').writeFileSync('/app/ai/data/ownership-probe','ok')"]);
console.log('ARM64 image execution, native Sharp, HTTP release liveness, worker runtime imports and UID-owned data write passed.');
console.log('Run verify:workspace with these images for sandbox/egress/preview acceptance. Host ARM architecture must be recorded separately from emulation.');
