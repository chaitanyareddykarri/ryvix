import test from 'node:test';
import assert from 'node:assert/strict';
import {deploy} from '../scripts/deploy.mjs';
const revision='a'.repeat(40),previous='b'.repeat(40);
test('failed release restores previously running workers and matching web revision',async()=>{
  const calls=[];
  const env={RYVIX_IMAGE:`ghcr.io/org/app:${revision}`,RYVIX_RELEASE_SHA:revision,RYVIX_RUNTIME_ENV_FILE:'/etc/ryvix/web.env',RYVIX_HEALTH_URL:'https://app.example.test/api/health',RYVIX_DEPLOY_WORKERS:'workspace',RYVIX_WORKER_ENV_DIR:'/etc/ryvix',RYVIX_DOCKER_GID:'999'};
  const run=(args,vars)=>{calls.push({args,vars});if(args.includes('ps'))return args.at(-1)==='web'?'oldweb':args.at(-1)==='workspace'?'oldworker':'';if(args[0]==='inspect')return args.includes('{{.Config.Image}}')?`ghcr.io/org/app:${previous}`:previous;return '';};
  let requests=0;
  await assert.rejects(deploy({env,run,request:async()=>Response.json({status:'ok',revision:++requests===1?'wrong':previous})}),/previous revision restored/);
  const rollback=calls.find(c=>c.args.includes('up')&&c.vars.RYVIX_RELEASE_SHA===previous);
  assert.ok(rollback.args.includes('workspace'));assert.equal(rollback.vars.RYVIX_WORKER_IMAGE,`ghcr.io/org/app-workers:${previous}`);
  assert.ok(calls.findIndex(c=>c.args.includes('pull'))<calls.findIndex(c=>c.args.includes('stop')));
});
test('omitting workers cannot silently leave the previous worker release running',async()=>{
  const env={RYVIX_IMAGE:`ghcr.io/org/app:${revision}`,RYVIX_RELEASE_SHA:revision,RYVIX_RUNTIME_ENV_FILE:'/etc/ryvix/web.env',RYVIX_HEALTH_URL:'https://app.example.test/api/health'};
  await assert.rejects(deploy({env,run:()=> 'workspace',request:async()=>{throw new Error('must not request');}}),/every running Compose worker/);
});
