import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const image=process.env.RYVIX_RAILWAY_TEST_IMAGE||'ryvix-railway:local';
const name='ryvix-railway-check-'+randomUUID();
const volume=name+'-data';
function docker(args,ok=true){const r=spawnSync('docker',args,{encoding:'utf8',timeout:30000});if(ok)assert.equal(r.status,0,r.stderr||r.error?.message);return r;}
for(const role of ['workspace','unknown']) {
  const r=docker(['run','--rm','--network','none',image,role],false);
  assert.notEqual(r.status,0);assert.match(r.stderr,/Docker workspaces require the VM/);
}
const missing=docker(['run','--rm','--network','none',image],false);
assert.notEqual(missing.status,0);assert.match(missing.stderr,/DATABASE_URL is required/);
docker(['volume','create',volume]);
try {
  docker(['run','-d','--name',name,'--network','none','--memory','512m',
    '--mount',`type=volume,source=${volume},target=/app/ai/data,volume-nocopy`,
    '-e','DATABASE_URL=postgresql://127.0.0.1:5432/fixture',
    '-e','NODE_ENV=production','-e','NODE_OPTIONS=--max-old-space-size=256',image]);
  // Wait for the real launcher to drop privileges; no provider or DB calls allowed.
  let uid='';
  for(let i=0;i<20;i++){
    uid=docker(['exec',name,'sh','-c','grep "^Uid:" /proc/1/status'],false).stdout||'';
    if(/Uid:\s+1000\s+1000/.test(uid))break;
    await new Promise(r=>setTimeout(r,250));
  }
  assert.match(uid,/Uid:\s+1000\s+1000/);
  await new Promise(r=>setTimeout(r,3000));
  assert.equal(docker(['inspect','--format','{{.State.Running}}',name]).stdout.trim(),'true',docker(['logs',name],false).stderr);
  docker(['exec','--user','1000:1000',name,'node','-e',
    "const fs=require('fs');fs.writeFileSync('/app/ai/data/probe','fixture');if(fs.statSync('/app/ai/data').uid!==1000)process.exit(1)"]);
  docker(['stop','--time','15',name]);
  assert.equal(docker(['inspect','--format','{{.State.ExitCode}}',name]).stdout.trim(),'0',docker(['logs',name],false).stderr);
  console.log('PASS: role rejection, missing-config rejection, root-owned volume initialization, UID 1000 worker, writable data and graceful stop.');
  console.log('Operations flags were disabled; this is not database/provider or Railway acceptance.');
} finally {
  docker(['rm','-f',name],false);
  docker(['volume','rm',volume]);
}
