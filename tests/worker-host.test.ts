import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import type {Pool} from 'pg';
import {workerHostConfiguration,workerPreviewDomain} from '../services/src/workspace/worker-host';
import {persistedPreviewLaunchUrl,verifyPreviewGrant} from '../services/src/workspace/preview-gateway';
import {RepositoryJobStore} from '../backend/src/services/repository-job-store';
export async function testWorkerHost(){
  const env={RYVIX_WORKER_HOST_ID:'a',PREVIEW_BASE_DOMAIN:'a.preview.example.com',RYVIX_WORKER_PREVIEW_DOMAINS:JSON.stringify({a:'a.preview.example.com',b:'b.preview.example.com'})};
  assert.equal(workerHostConfiguration(env).hostId,'a');
  assert.throws(()=>workerPreviewDomain('unknown',env));
  assert.throws(()=>workerHostConfiguration({...env,PREVIEW_BASE_DOMAIN:'b.preview.example.com'}));
  assert.throws(()=>workerPreviewDomain('a',{...env,RYVIX_WORKER_PREVIEW_DOMAINS:'{"a":"same.example.com","b":"same.example.com"}'}));
  const oldMap=process.env.RYVIX_WORKER_PREVIEW_DOMAINS,oldKey=process.env.PREVIEW_SIGNING_SECRET;
  process.env.RYVIX_WORKER_PREVIEW_DOMAINS=env.RYVIX_WORKER_PREVIEW_DOMAINS;process.env.PREVIEW_SIGNING_SECRET=randomBytes(32).toString('hex');
  try{
    const id=randomUUID(),session={id,worker_host_id:'a',preview_url:`https://${id}.a.preview.example.com`,expires_at:new Date(Date.now()+300000).toISOString(),status:'active'};
    const launch=new URL(persistedPreviewLaunchUrl(session));
    assert.equal(launch.hostname,`${id}.a.preview.example.com`);assert.ok(verifyPreviewGrant(launch.searchParams.get('__ryvix_grant')!,id));
    assert.throws(()=>persistedPreviewLaunchUrl({...session,worker_host_id:'b'}));
    assert.throws(()=>persistedPreviewLaunchUrl({...session,worker_host_id:null}));
    assert.throws(()=>persistedPreviewLaunchUrl({...session,preview_url:'https://attacker.example'}));
  }finally{
    if(oldMap===undefined)delete process.env.RYVIX_WORKER_PREVIEW_DOMAINS;else process.env.RYVIX_WORKER_PREVIEW_DOMAINS=oldMap;
    if(oldKey===undefined)delete process.env.PREVIEW_SIGNING_SECRET;else process.env.PREVIEW_SIGNING_SECRET=oldKey;
  }
  const calls:Array<{sql:string;args?:unknown[]}>=[];
  const query=async(sql:string,args?:unknown[])=>{calls.push({sql,args});return {rows:[]};};
  const pool={query,connect:async()=>({query,release(){}})} as unknown as Pool;
  const a=new RepositoryJobStore(pool,'a'),b=new RepositoryJobStore(pool,'b');
  await a.cleanupSessions();await b.previewSessions();await a.markDestroyed(randomUUID());
  assert.ok(calls[0].sql.includes('w.worker_host_id=$1'));assert.equal(calls[0].args?.[0],'a');
  assert.ok(calls[1].sql.includes('worker_host_id=$1'));assert.equal(calls[1].args?.[0],'b');
  assert.ok(calls.some(c=>c.sql.includes('worker_host_id=$2')&&c.args?.[1]==='a'));
  await assert.rejects(new RepositoryJobStore(pool).claim(randomUUID()),/host required/);
}
