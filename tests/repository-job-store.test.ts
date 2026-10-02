import assert from 'node:assert/strict';
import { RepositoryJobStore, type RepositoryJob } from '../backend/src/services/repository-job-store';
import type { Pool } from 'pg';

export async function testRepositoryJobStore() {
  let mode='ok'; const calls: string[]=[]; let auditArgs: unknown[]=[];
  const job: RepositoryJob={ task_id:'task',repository_id:'repo',project_id:'project',organization_id:'org',created_by:'user',
    user_prompt:'change',full_name:'acme/app',default_branch:'main' };
  const client={release(){calls.push('release');},async query(sql:string, params?:unknown[]){
    calls.push(sql);
    if(sql.includes('SELECT r.project_id')) return {rows:mode==='denied'?[]:[{project_id:'project'}],rowCount:1};
    if(sql.includes('SELECT c.id FROM connectors')) return {rows:mode==='no-credential'?[]:[{id:'connector'}]};
    if(sql.includes('count(*)::int')) return {rows:[{count:mode==='full'?10:0}]};
    if(sql.includes('INSERT INTO tasks')) return {rows:[{id:'task',status:'queued'}]};
    if(sql.includes('SELECT j.task_id,j.repository_id')) return {rows:mode==='empty'?[]:[job]};
    if(sql.includes('SELECT t.id FROM tasks')) return {rows:mode==='lease-lost'?[]:[{id:'task'}],rowCount:mode==='lease-lost'?0:1};
    if(sql.includes('UPDATE workspace_sessions SET status=')) return {rows:[{project_id:'project'}],rowCount:1};
    if(sql.includes('INSERT INTO audit_events')) auditArgs=params || [];
    if(sql.includes('INSERT INTO audit_events') && mode==='audit-failure') throw new Error('audit unavailable');
    return {rows:[{id:'row'}],rowCount:1};
  }};
  const store=new RepositoryJobStore({connect:async()=>client,query:client.query} as unknown as Pool,'host-a');
  await store.enqueue('repo','org','user','change');
  assert.ok(calls.findIndex(s=>s.startsWith('INSERT INTO tasks')) < calls.findIndex(s=>s.startsWith('INSERT INTO repository_jobs')));
  assert.ok(calls.includes('COMMIT'));
  for(mode of ['denied','no-credential','full','audit-failure']) {
    calls.length=0;
    await assert.rejects(store.enqueue('repo','org','user','change'));
    assert.ok(calls.includes('ROLLBACK') && !calls.includes('COMMIT'));
  }
  mode='ok';calls.length=0;
  assert.equal((await store.claim('worker'))?.task_id,'task');
  assert.ok(calls.some(s=>s.includes('SKIP LOCKED')));
  assert.equal(auditArgs[1],null,'Worker claim audit must not impersonate the task creator');
  assert.equal(auditArgs[2],'system');
  mode='empty'; assert.equal(await store.claim('worker'),null);
  mode='ok'; calls.length=0; auditArgs=[];
  await store.markDestroyed('session');
  assert.ok(calls.some(s=>s.includes("UPDATE workspace_sessions SET status='destroyed'")),'Production cleanup persists the terminal session state');
  assert.ok(calls.some(s=>s.includes('workspace.cleanup.success')),'Production cleanup writes its audit in the same transaction');
  calls.length=0; auditArgs=[];
  await store.fail(job,'worker');
  assert.equal(auditArgs[1],null,'Worker failures must be attributed to the system, not the task creator');
  assert.equal(auditArgs[2],'system');
  assert.equal(auditArgs[3],'task.execute.failure');
  mode='lease-lost'; calls.length=0;
  await assert.rejects(store.plan(job,'worker','summary',['step']),/lease lost/);
  assert.ok(!calls.some(s=>s.includes('INSERT INTO plans')));
  await assert.rejects(store.complete(job,'worker',{} as any),/lease lost/);
  assert.ok(!calls.some(s=>s.includes('INSERT INTO task_artifacts')));
}
