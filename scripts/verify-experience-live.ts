import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID,randomInt} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client,type Pool} from 'pg';
import {ExperienceStore} from '../backend/src/services/experience-store';
import {ExperienceCollector} from '../backend/src/services/experience-collector';
import {NeuralThreatClassifier} from '../ai/src/neural-network';
import {ConversationStore} from '../backend/src/services/conversation-store';

async function main(){
  const defaults:Record<string,string>={};for(const f of ['.env','.env.local','web/.env.local'])if(fs.existsSync(f))Object.assign(defaults,parseEnv(fs.readFileSync(f,'utf8')));
  for(const [k,v] of Object.entries(defaults))if(process.env[k]===undefined)process.env[k]=v;
  const url=new URL(process.env.DATABASE_URL!);for(const k of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(k);
  const c=new Client({connectionString:url.toString(),connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT}});
  let phase='connect';const user=randomUUID(),reviewer=randomUUID(),project=randomUUID(),env=randomUUID(),server=randomUUID(),repo=randomUUID(),task=randomUUID(),conversation=randomUUID();
  try{await c.connect();await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='30s'");
    phase='migration';if(!(await c.query("SELECT to_regclass('public.experience_events') AS t")).rows[0].t)await c.query(fs.readFileSync('supabase/migrations/20261003000001_experience_memory.sql','utf8'));
    for(const role of ['anon','authenticated'])for(const table of ['experience_settings','experience_events','experience_lessons','personal_memories','experience_predictions']){
      assert.equal((await c.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') AS allowed",[role,table])).rows[0].allowed,false);
      assert.equal((await c.query('SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass',[table])).rows[0].relrowsecurity,true);
    }
    phase='fixtures';for(const u of [user,reviewer])await c.query("INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES($1,$2,now(),'{}')",[u,`rollback-${u}@example.test`]);
    const org=(await c.query('SELECT organization_id FROM profiles WHERE id=$1',[user])).rows[0].organization_id;
    await c.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'admin') ON CONFLICT(organization_id,user_id) DO UPDATE SET role='admin'",[org,reviewer]);
    await c.query("INSERT INTO projects(id,organization_id,name,slug) VALUES($1,$2,'Experience fixture','experience-fixture')",[project,org]);
    await c.query("INSERT INTO environments(id,project_id,name,slug) VALUES($1,$2,'Fixture','fixture')",[env,project]);
    await c.query("INSERT INTO servers(id,environment_id,hostname,os_type,status) VALUES($1,$2,'fixture','linux','healthy')",[server,env]);
    await c.query("INSERT INTO repositories(id,project_id,github_repo_id,full_name,clone_url,default_branch) VALUES($1,$2,$3,'fixture/repo','https://github.com/fixture/repo.git','main')",[repo,project,7_000_000_000_000+randomInt(1e9)]);
    const query=(sql:string,args?:unknown[])=>c.query(sql==='BEGIN'?'SAVEPOINT fixture_store':sql==='COMMIT'?'RELEASE SAVEPOINT fixture_store':sql==='ROLLBACK'?'ROLLBACK TO SAVEPOINT fixture_store':sql,args);
    const pool={query,connect:async()=>({query,release(){}})} as unknown as Pool;
    const store=new ExperienceStore(pool),collector=new ExperienceCollector(pool);
    phase='memory isolation';const memory=await store.remember(org,user,{kind:'preference',content:'Explain changes briefly using TypeScript.'});
    assert.equal((await store.memories(org,user)).length,1);assert.equal((await store.memories(org,reviewer)).length,0);
    await assert.rejects(store.remember(org,reviewer,{id:memory.id,kind:'goal',content:'Replace another users preference'}),/unavailable/);
    await assert.rejects(store.memories(randomUUID(),user),/denied/);
    await store.forget(org,user,memory.id);assert.equal((await store.memories(org,user)).length,0);
    phase='opt in and capture';assert.equal(await collector.collectProject(project),0);
    await assert.rejects(store.configure(randomUUID(),user,project,true,30),/denied/);
    await store.configure(org,user,project,true,30);
    await c.query("UPDATE experience_settings SET enabled_at=now()-interval '2 hours' WHERE project_id=$1",[project]);
    await c.query("INSERT INTO tasks(id,project_id,created_by,task_type,status,user_prompt) VALUES($1,$2,$3,'coding','completed','Private prompt must not be copied')",[task,project,user]);
    await c.query("INSERT INTO task_artifacts(task_id,repository_id,base_commit_sha,base_branch,files,verification) VALUES($1,$2,$3,'main','[]','[{\"success\":true}]')",[task,repo,'a'.repeat(40)]);
    await c.query("INSERT INTO security_events(server_id,event_type,severity,raw_evidence) VALUES($1,'http_attack','high','{\"secret\":\"never-copy-raw-evidence\"}')",[server]);
    await c.query(`INSERT INTO telemetry_metric_rollups(server_id,bucket_timestamp,cpu_avg,cpu_max,ram_used_mb,ram_percent,disk_used_percent,authenticated)
      VALUES($1,date_trunc('hour',now())-interval '1 hour',20,50,100,40,30,true)`,[server]);
    await c.query(`INSERT INTO deployment_events(repository_id,delivery_id,github_status_id,github_deployment_id,commit_sha,environment,state,provider_created_at,payload_hash)
      VALUES($1,$2,1,1,$3,'fixture','failure',now(),$4)`,[repo,randomUUID(),'b'.repeat(40),'c'.repeat(64)]);
    for(const kind of ['service','recovery']){
      const id=randomUUID(),approval=(await c.query(`INSERT INTO approval_requests(organization_id,resource_type,resource_id,title,description,risk_level,expires_at)
        VALUES($1,'server_command',$2,'Fixture','Fixture','high',now()+interval '10 minutes') RETURNING id`,[org,id])).rows[0].id;
      if(kind==='service')await c.query("INSERT INTO server_commands(id,server_id,project_id,requested_by,approval_id,action,service,status) VALUES($1,$2,$3,$4,$5,'restart_service','fixture.service','unknown')",[id,server,project,user,approval]);
      else await c.query("INSERT INTO cloud_recovery_requests(id,server_id,project_id,requested_by,approval_id,provider,instance_id,status) VALUES($1,$2,$3,$4,$5,'aws','i-fixture','unknown')",[id,server,project,user,approval]);
    }
    assert.equal(await collector.collectProject(project),6);assert.equal(await collector.collectProject(project),0);
    const before=await store.list(org,user,project);assert.equal(before.events.length,6);
    assert.ok(!JSON.stringify(before).includes('never-copy-raw-evidence'));assert.ok(!JSON.stringify(before).includes('Private prompt'));
    phase='observation-only prediction';assert.equal(await collector.shadowProject(project),0);
    // This artificial checkpoint only verifies storage and no-action wiring, never accuracy.
    const example=(await c.query(`INSERT INTO learning_examples(project_id,submitted_by,reviewed_by,status,partition,label,event,event_hash,provenance)
      VALUES($1,$2,$3,'approved','train','NORMAL','{}','fixture','Artificial rollback fixture, not quality evidence') RETURNING id`,[project,user,reviewer])).rows[0].id;
    const checkpoint=(await c.query(`INSERT INTO learning_checkpoints(project_id,dataset_hash,sample_ids,weights,metrics,eligible)
      VALUES($1,'fixture',$2,$3,'{}',true) RETURNING id`,[project,[example],JSON.stringify(new NeuralThreatClassifier().exportWeights())])).rows[0].id;
    await c.query('INSERT INTO learning_deployments(project_id,checkpoint_id,promoted_by) VALUES($1,$2,$3)',[project,checkpoint,user]);
    assert.equal(await collector.shadowProject(project),1);assert.equal(await collector.shadowProject(project),0);
    assert.equal((await store.list(org,user,project)).shadow.reduce((n,r)=>n+r.samples,0),1);
    await c.query("UPDATE learning_examples SET status='rejected' WHERE id=$1",[example]);
    await assert.rejects(collector.shadowProject(project),/no longer valid/);
    phase='lesson review and revocation';const coding=before.events.find(e=>e.kind==='coding');
    const lesson=await store.propose(org,user,project,coding.id,'TypeScript changes need sandbox checks before an approved release.');
    assert.equal((await store.retrieve(org,user,project,'TypeScript sandbox')).length,0);
    await assert.rejects(store.review(org,user,project,lesson.id,true,'I independently reviewed the evidence.'),/independent/);
    await store.review(org,reviewer,project,lesson.id,true,'I checked the recorded sandbox verification and the scope of this lesson.');
    assert.equal((await store.retrieve(org,user,project,'TypeScript sandbox')).length,1);
    assert.equal((await store.retrieve(org,user,null,'TypeScript sandbox')).length,1);
    await assert.rejects(store.retrieve(randomUUID(),user,null,'TypeScript sandbox'),/denied/);
    await c.query("UPDATE organization_members SET role='viewer' WHERE organization_id=$1 AND user_id=$2",[org,reviewer]);
    assert.equal((await store.retrieve(org,user,project,'TypeScript sandbox')).length,0);
    assert.equal((await store.retrieve(org,reviewer,null,'TypeScript sandbox')).length,0);
    await assert.rejects(store.configure(org,reviewer,project,false,30),/denied/);
    await c.query("UPDATE organization_members SET role='admin' WHERE organization_id=$1 AND user_id=$2",[org,reviewer]);
    await store.revoke(org,reviewer,project,lesson.id);assert.equal((await store.retrieve(org,user,project,'TypeScript sandbox')).length,0);
    phase='owned feedback';await c.query('INSERT INTO chat_conversations(id,organization_id,user_id) VALUES($1,$2,$3)',[conversation,org,user]);
    const history=new ConversationStore(pool),session=await history.begin(org,user,conversation);
    const turn=await history.finish(session.id,session.lease,org,user,'What failed?','Insufficient evidence',{latencyMs:123,provider:'fixture',model:'fixture'});
    assert.equal(Number((await store.responseStats(org,user))[0].average_latency_ms),123);
    assert.equal((await store.responseStats(org,reviewer)).length,0);
    const feedback={conversationId:conversation,turnId:String(turn),correction:'The build failed; its recorded check did not pass.'};
    await assert.rejects(store.feedback(org,reviewer,project,feedback),/unavailable/);
    await store.feedback(org,user,project,feedback);await assert.rejects(store.feedback(org,user,project,feedback),/already/);
    phase='retention and purge';await c.query("UPDATE experience_events SET expires_at=now()-interval '1 second' WHERE id=$1",[coding.id]);
    await collector.collectProject(project);assert.equal((await c.query('SELECT 1 FROM experience_lessons WHERE id=$1',[lesson.id])).rowCount,0);
    await store.configure(org,user,project,false,30);assert.equal((await store.list(org,user,project)).events.length,0);assert.equal(await collector.collectProject(project),0);
    await assert.rejects(store.feedback(org,user,project,feedback),/disabled/);
    await c.query('ROLLBACK');assert.equal((await c.query('SELECT id FROM auth.users WHERE id=$1',[user])).rowCount,0);
    console.log('PASS real SQL: protected tables, tenant and memory isolation, all six source collectors, deduplication, secret exclusion, independent review, revoked role, owned feedback, expiry and opt-out purge. All fixtures rolled back; no provider calls.');
  }catch(e:any){console.error(`Experience SQL check failed at ${phase} (${String(e.code||e.name||'FAILED').replace(/[^a-z0-9_]/gi,'')}).`);if(['42P08','42883','42703','23514'].includes(e.code))console.error(String(e.message).slice(0,250));process.exitCode=1;}
  finally{await c.query('ROLLBACK').catch(()=>{});await c.end().catch(()=>{});}
}
void main();
