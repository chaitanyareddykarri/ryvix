import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID,generateKeyPairSync,sign} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client,type Pool} from 'pg';
import {ingestHostLogs} from '../backend/src/services/host-logs';
import {signingMessage} from '../backend/src/services/device-protocol';
import {createInfrastructureEnvironment} from '../backend/src/services/infrastructure-environment';
import {TeamStore} from '../backend/src/services/team-store';
import {RepositoryJobStore,type RepositoryJob} from '../backend/src/services/repository-job-store';

// Explicit synthetic fixtures, no provider calls. Outer transaction always rolls back.
async function main(){
 if(!process.argv.includes('--rollback-test'))throw new Error('Explicit --rollback-test required');
 for(const path of ['.env','.env.local']){try{for(const [key,value] of Object.entries(parseEnv(readFileSync(path,'utf8'))))if(process.env[key]===undefined)process.env[key]=value;}catch{}}
 const url=new URL(process.env.DATABASE_URL!);for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
 const client=new Client({connectionString:url.toString(),connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,...(process.env.DATABASE_CA_CERT?{ca:process.env.DATABASE_CA_CERT}:{})}});
 const users=[randomUUID(),randomUUID()];let stage='connection';
 try{
  await client.connect();await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='1s'");await client.query("SET LOCAL statement_timeout='10s'");
  stage='migration syntax and privileges';
  for(const name of ['20261009000001_host_logs.sql','20261009000002_repository_quota_retry.sql'])await client.query(readFileSync('supabase/migrations/'+name,'utf8'));
  const privileges=(await client.query("SELECT has_table_privilege('authenticated','public.host_log_entries','SELECT') AS browser,has_table_privilege('service_role','public.host_log_entries','INSERT') AS backend")).rows[0];
  assert.equal(privileges.browser,false);assert.equal(privileges.backend,true);
  stage='fixtures';
  for(const user of users)await client.query("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,'{}')",[user,`rollback-${user}@example.test`]);
  const org=(await client.query('SELECT organization_id FROM profiles WHERE id=$1',[users[0]])).rows[0].organization_id;
  const other=(await client.query('SELECT organization_id FROM profiles WHERE id=$1',[users[1]])).rows[0].organization_id;
  const query=(sql:string,args?:unknown[])=>client.query(sql==='BEGIN'?'SAVEPOINT store_test':sql==='COMMIT'?'RELEASE SAVEPOINT store_test':sql==='ROLLBACK'?'ROLLBACK TO SAVEPOINT store_test':sql,args);
  const pool={query,connect:async()=>({query,release(){}})} as unknown as Pool;
  stage='environment idempotency and denial';
  const input={projectName:'Rollback infrastructure',environmentName:'Test',isProduction:false};
  const environment=await createInfrastructureEnvironment(pool,org,users[0],input);
  assert.equal((await createInfrastructureEnvironment(pool,org,users[0],input)).id,environment.id);
  await assert.rejects(createInfrastructureEnvironment(pool,org,users[1],input));
  const project=(await client.query('SELECT project_id FROM environments WHERE id=$1',[environment.id])).rows[0].project_id;
  stage='invitation acceptance and replay';
  const teams=new TeamStore(pool);const invitation=await teams.invite(org,users[0],`rollback-${users[1]}@example.test`,'developer');
  await teams.accept(users[1],`rollback-${users[1]}@example.test`,true,invitation.token);
  await assert.rejects(teams.accept(users[1],`rollback-${users[1]}@example.test`,true,invitation.token));
  stage='signed logs and deduplication';
  const pair=generateKeyPairSync('ed25519'),publicKey=pair.publicKey.export({format:'der',type:'spki'}).toString('base64');
  const connector=(await client.query("INSERT INTO connectors(environment_id,name,connector_type,status,device_public_key) VALUES($1,'Rollback agent','server_inband','active',$2) RETURNING id",[environment.id,publicKey])).rows[0].id;
  const server=(await client.query("INSERT INTO servers(environment_id,connector_id,hostname,os_type,status) VALUES($1,$2,'rollback-host','linux','healthy') RETURNING id",[environment.id,connector])).rows[0].id;
  const raw=Buffer.from(JSON.stringify({serverId:server,entries:Array.from({length:5},()=>({id:randomUUID(),source:'sshd',timestamp:new Date().toISOString(),severity:'warning',message:'Failed password for invalid user test token=private-fixture'}))}));
  const headers=()=>{const timestamp=String(Date.now()),nonce=randomUUID();return new Headers({'x-ryvix-timestamp':timestamp,'x-ryvix-nonce':nonce,'x-ryvix-signature':sign(null,signingMessage(raw,timestamp,nonce,'/api/connector/logs'),pair.privateKey).toString('base64')});};
  const first=headers();assert.equal((await ingestHostLogs(pool,raw,first)).received,5);
  await assert.rejects(ingestHostLogs(pool,raw,first));assert.equal((await ingestHostLogs(pool,raw,headers())).received,0);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM security_events WHERE server_id=$1',[server])).rows[0].n,1);
  assert.ok((await client.query('SELECT message FROM host_log_entries WHERE server_id=$1',[server])).rows.every(row=>!row.message.includes('private-fixture')));
  stage='quota deferral and future claims';
  const repository=(await client.query("INSERT INTO repositories(project_id,github_repo_id,full_name,clone_url) VALUES($1,$2,'fixture/repository','https://github.com/fixture/repository.git') RETURNING id",[project,Math.floor(Math.random()*1000000000000)+8000000000000])).rows[0].id;
  const task=(await client.query("INSERT INTO tasks(project_id,created_by,channel,task_type,status,user_prompt) VALUES($1,$2,'web','coding','planning','Rollback fixture') RETURNING id",[project,users[0]])).rows[0].id;
  const worker=randomUUID();await client.query("INSERT INTO repository_jobs(task_id,repository_id,status,worker_id,worker_host_id,lease_expires_at) VALUES($1,$2,'running',$3,'rollback-host',now()+interval '5 minutes')",[task,repository,worker]);
  const job={task_id:task,repository_id:repository,project_id:project,organization_id:org,created_by:users[0],user_prompt:'Rollback fixture',full_name:'fixture/repository',default_branch:'main'} satisfies RepositoryJob;
  const store=new RepositoryJobStore(pool,'rollback-host');assert.equal(await store.deferQuota(job,worker,Date.now()+60000),true);
  const state=(await client.query('SELECT status,quota_retries,available_at>now() AS waiting FROM repository_jobs WHERE task_id=$1',[task])).rows[0];
  assert.deepEqual(state,{status:'queued',quota_retries:1,waiting:true});
  // Never invoke global claim(): it might claim a real queued task.
  assert.equal((await client.query("SELECT task_id FROM repository_jobs WHERE task_id=$1 AND status='queued' AND available_at<=now()",[task])).rowCount,0);
  assert.notEqual(org,other);
  await client.query('ROLLBACK');
  assert.equal((await client.query('SELECT id FROM auth.users WHERE id=ANY($1::uuid[])',[users])).rowCount,0);
  console.log('PASS rollback-only migration, log signature/deduplication, tenant denial, environment idempotency, invitation replay and quota persistence. No concurrency or live-provider certification.');
 }catch{await client.query('ROLLBACK').catch(()=>{});console.error(`FAIL rollback-only SQL check at ${stage}; no success claimed.`);process.exitCode=1;}finally{await client.end();}
}
main().catch(()=>{console.error('SQL verification unavailable; explicit opt-in and verified database configuration required.');process.exitCode=1;});
