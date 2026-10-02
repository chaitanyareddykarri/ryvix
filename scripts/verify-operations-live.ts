import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID,generateKeyPairSync,sign} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client,type Pool} from 'pg';
import {ServerCommandStore} from '../backend/src/services/server-command-store';
import {RepositoryJobStore} from '../backend/src/services/repository-job-store';
import {signingMessage} from '../backend/src/services/device-protocol';
import {verifyCommand} from '../backend/src/services/command-protocol';
import {DeploymentRuntimeStore} from '../backend/src/services/deployment-runtime';

async function main(){
 const defaults:Record<string,string>={};for(const f of ['.env','.env.local','web/.env.local'])if(fs.existsSync(f))Object.assign(defaults,parseEnv(fs.readFileSync(f,'utf8')));
 for(const [name,value] of Object.entries(defaults))if(process.env[name]===undefined)process.env[name]=value;
 const url=new URL(process.env.DATABASE_URL!);for(const name of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(name);
 const client=new Client({connectionString:url.toString(),connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT}});
 const users=[randomUUID(),randomUUID()],project=randomUUID(),environment=randomUUID(),server=randomUUID(),connector=randomUUID();
 const key=generateKeyPairSync('ed25519'),device=generateKeyPairSync('ed25519');
 process.env.RYVIX_COMMAND_PRIVATE_KEY=key.privateKey.export({type:'pkcs8',format:'der'}).toString('base64');process.env.RYVIX_COMMAND_SERVICES='fixture.service';
 let phase='connect';
 try{
  await client.connect();await client.query('BEGIN');await client.query("SET LOCAL statement_timeout='15s'");
  phase='fixtures';
  for(const user of users)await client.query("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,'{}')",[user,`rollback-${user}@example.test`]);
  const org=(await client.query('SELECT organization_id FROM profiles WHERE id=$1',[users[0]])).rows[0].organization_id;
  const otherOrg=(await client.query('SELECT organization_id FROM profiles WHERE id=$1',[users[1]])).rows[0].organization_id;
  await client.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'admin')",[org,users[1]]);
  await client.query("INSERT INTO projects(id,organization_id,name,slug) VALUES($1,$2,'Rollback fixture','fixture')",[project,org]);
  await client.query("INSERT INTO environments(id,project_id,name,slug) VALUES($1,$2,'Fixture','fixture')",[environment,project]);
  await client.query("INSERT INTO connectors(id,environment_id,name,connector_type,status,device_public_key) VALUES($1,$2,'Fixture','server_inband','active',$3)",[connector,environment,device.publicKey.export({type:'spki',format:'der'}).toString('base64')]);
  await client.query("INSERT INTO servers(id,environment_id,connector_id,hostname,os_type,status) VALUES($1,$2,$3,'fixture','linux','healthy')",[server,environment,connector]);
  const query=(sql:string,args?:unknown[])=>client.query(sql==='BEGIN'?'SAVEPOINT operation_store':sql==='COMMIT'?'RELEASE SAVEPOINT operation_store':sql==='ROLLBACK'?'ROLLBACK TO SAVEPOINT operation_store':sql,args);
  const pool={query,connect:async()=>({query,release(){}})} as unknown as Pool,store=new ServerCommandStore(pool);
  function signed(input:object,path:'/api/connector/commands/poll'|'/api/connector/commands/result'){
    const raw=Buffer.from(JSON.stringify(input)),timestamp=String(Date.now()),nonce=randomUUID();
    return {raw,headers:new Headers({'x-ryvix-timestamp':timestamp,'x-ryvix-nonce':nonce,'x-ryvix-signature':sign(null,signingMessage(raw,timestamp,nonce,path),device.privateKey).toString('base64')})};
  }
  const pollPath='/api/connector/commands/poll',resultPath='/api/connector/commands/result';
  const poll=()=>{const {raw,headers}=signed({serverId:server},pollPath);return store.device(raw,headers,pollPath) as Promise<any>;};
  phase='request and independent approval';
  await assert.rejects(store.request(otherOrg,users[1],server,'fixture.service'),/denied/);
  const request=await store.request(org,users[0],server,'fixture.service');
  assert.equal((await poll()).command,null);
  await assert.rejects(store.decide(org,users[0],request.id,true),/independent/);
  await store.decide(org,users[1],request.id,true);
  phase='revocation before dispatch';
  await client.query("UPDATE organization_members SET role='viewer' WHERE organization_id=$1 AND user_id=$2",[org,users[1]]);
  assert.equal((await poll()).command,null);
  await client.query("UPDATE organization_members SET role='admin' WHERE organization_id=$1 AND user_id=$2",[org,users[1]]);
  phase='signed delivery and replay';
  const signedPoll=signed({serverId:server},pollPath),delivered:any=await store.device(signedPoll.raw,signedPoll.headers,pollPath);
  const decoded=verifyCommand(delivered.command,server,key.publicKey.export({type:'spki',format:'der'}).toString('base64'),'fixture.service');
  assert.equal(decoded.id,request.id);assert.deepEqual((await poll()).command,delivered.command);
  await assert.rejects(store.device(signedPoll.raw,signedPoll.headers,pollPath),/replay/);
  phase='signed outcome and duplicate receipts';
  const result={serverId:server,commandId:request.id,status:'succeeded',serviceState:'active'};
  for(let i=0;i<2;i++){const r=signed(result,resultPath);assert.equal((await store.device(r.raw,r.headers,resultPath) as any).acknowledged,true);}
  const conflict=signed({...result,status:'failed'},resultPath);await assert.rejects(store.device(conflict.raw,conflict.headers,resultPath),/Conflicting/);
  assert.equal((await store.list(org,users[0]))[0].status,'succeeded');
  assert.equal((await store.list(otherOrg,users[1])).length,0);
  const next=await store.request(org,users[0],server,'fixture.service');await store.decide(org,users[1],next.id,true);assert.equal((await poll()).command,null,'Restart cooldown applies');
  phase='host-scoped cleanup';
  const task=(await client.query("INSERT INTO tasks(project_id,created_by,task_type,user_prompt,status) VALUES($1,$2,'coding','Fixture','failed') RETURNING id",[project,users[0]])).rows[0].id;
  const session=randomUUID();
  await client.query("INSERT INTO workspace_sessions(id,task_id,project_id,container_id,status,expires_at,worker_host_id) VALUES($1,$2,$3,'fixture-container','active',now()-interval '1 minute','host-a')",[session,task,project]);
  const a=new RepositoryJobStore(pool,'host-a'),b=new RepositoryJobStore(pool,'host-b');
  assert.ok((await a.cleanupSessions()).some(s=>s.id===session));assert.ok(!(await b.cleanupSessions()).some(s=>s.id===session));
  await b.markDestroyed(session);assert.equal((await client.query('SELECT status FROM workspace_sessions WHERE id=$1',[session])).rows[0].status,'active');
  await a.markDestroyed(session);assert.equal((await client.query('SELECT status FROM workspace_sessions WHERE id=$1',[session])).rows[0].status,'destroyed');
  phase='deployment runtime mapping and observations';
  const repository=randomUUID();
  await client.query("INSERT INTO repositories(id,project_id,github_repo_id,full_name,clone_url,github_verified_at) VALUES($1,$2,$3,$4,$5,now())",[repository,project,8_000_000_000_000+Math.floor(Math.random()*1e9),`fixture/${repository}`,`https://github.com/fixture/${repository}.git`]);
  let probeCalls=0,revokeDuringProbe=false;
  const runtime=new DeploymentRuntimeStore(pool,async()=>{probeCalls++;if(revokeDuringProbe)await client.query("UPDATE organization_members SET role='viewer' WHERE organization_id=$1 AND user_id=$2",[org,users[0]]);return {isReachable:true,status:'reachable',statusCode:200,latencyMs:10};});
  const target=await runtime.configure(org,users[0],{repositoryId:repository,environmentId:environment,providerEnvironment:'fixture',endpointUrl:'https://fixture.example.test/health'});
  await assert.rejects(runtime.check(org,users[0],target.id),/No verified deployment/);assert.equal(probeCalls,0);
  await client.query(`INSERT INTO deployment_events(repository_id,delivery_id,github_status_id,github_deployment_id,commit_sha,environment,state,provider_created_at,payload_hash)
    VALUES($1,$2,1,1,$3,'fixture','success',now()-interval '1 minute',$4)`,[repository,randomUUID(),'a'.repeat(40),'b'.repeat(64)]);
  await assert.rejects(runtime.check(otherOrg,users[1],target.id),/denied/);assert.equal(probeCalls,0);
  const observed=await runtime.check(org,users[0],target.id);assert.equal(observed.commitVerified,false);assert.equal(observed.probe.isReachable,true);
  assert.equal((await runtime.list(org,users[0]))[0].status_code,200);
  await assert.rejects(runtime.check(org,users[0],target.id),/30 seconds/);
  await client.query("UPDATE deployment_targets SET last_probe_at=now()-interval '1 minute' WHERE id=$1",[target.id]);revokeDuringProbe=true;
  await assert.rejects(runtime.check(org,users[0],target.id),/denied/);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM deployment_runtime_observations WHERE target_id=$1',[target.id])).rows[0].n,1,'Revoked operator cannot persist a new observation');
  await client.query('ROLLBACK');assert.equal((await client.query('SELECT id FROM auth.users WHERE id=ANY($1::uuid[])',[users])).rowCount,0);
  console.log('PASS real SQL independent approvals, revoked approver, signed dispatch, nonce replay rejection, durable receipt deduplication, cooldown, worker-host cleanup isolation and deployment runtime mapping/reauthorization. All fixtures rolled back; probe output is an injected fixture, and no device/cloud operation executed.');
 }catch(error:any){console.error(`Operations SQL verification failed during ${phase} (${String(error.code||'CHECK_FAILED').replace(/[^a-z0-9_]/gi,'')}).`);process.exitCode=1;}
 finally{await client.query('ROLLBACK').catch(()=>{});await client.end().catch(()=>{});}
}
void main();
