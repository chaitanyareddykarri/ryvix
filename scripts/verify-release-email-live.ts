import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID,generateKeyPairSync,sign} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client,type Pool} from 'pg';
import {ReleaseStore} from '../backend/src/services/release-store';
import {EmailNotifications} from '../backend/src/services/email-notifications';
import {ingestSecuritySignals} from '../backend/src/services/security-ingestion';
import {signingMessage} from '../backend/src/services/device-protocol';

async function main(){
  const defaults:Record<string,string>={};for(const f of ['.env','.env.local','web/.env.local'])if(fs.existsSync(f))Object.assign(defaults,parseEnv(fs.readFileSync(f,'utf8')));
  for(const [k,v] of Object.entries(defaults))if(process.env[k]===undefined)process.env[k]=v;
  const url=new URL(process.env.DATABASE_URL!);for(const k of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(k);
  const c=new Client({connectionString:url.toString(),connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT}});
  let phase='connect';const user=randomUUID(),project=randomUUID(),env=randomUUID(),server=randomUUID(),connector=randomUUID(),repo=randomUUID(),task=randomUUID(),plan=randomUUID();
  let targetVersion='';
  const head='a'.repeat(40),merge='b'.repeat(40),device=generateKeyPairSync('ed25519');
  try{await c.connect();await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='15s'");
    phase='migration';if(!(await c.query("SELECT to_regclass('public.release_requests') AS t")).rows[0].t)await c.query(fs.readFileSync('supabase/migrations/20261002000003_release_email_notifications.sql','utf8'));
    for(const role of ['anon','authenticated'])for(const table of ['release_requests','email_notification_preferences','email_notification_outbox'])assert.equal((await c.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') AS allowed",[role,table])).rows[0].allowed,false);
    phase='fixtures';await c.query("INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES($1,$2,now(),'{}')",[user,`rollback-${user}@example.test`]);
    const org=(await c.query('SELECT organization_id FROM profiles WHERE id=$1',[user])).rows[0].organization_id;
    await c.query("INSERT INTO projects(id,organization_id,name,slug) VALUES($1,$2,'Fixture','release-email')",[project,org]);
    await c.query("INSERT INTO environments(id,project_id,name,slug) VALUES($1,$2,'Production fixture','fixture')",[env,project]);
    await c.query("INSERT INTO connectors(id,environment_id,name,connector_type,status,device_public_key) VALUES($1,$2,'Fixture','server_inband','active',$3)",[connector,env,device.publicKey.export({type:'spki',format:'der'}).toString('base64')]);
    await c.query("INSERT INTO servers(id,environment_id,connector_id,hostname,os_type,status) VALUES($1,$2,$3,'fixture','linux','healthy')",[server,env,connector]);
    await c.query("INSERT INTO repositories(id,project_id,github_repo_id,full_name,clone_url,default_branch,github_verified_at) VALUES($1,$2,$3,'fixture/repo','https://github.com/fixture/repo.git','main',now())",[repo,project,8_000_000_000_000+Math.floor(Math.random()*1e9)]);
    await c.query("INSERT INTO tasks(id,project_id,created_by,task_type,status,user_prompt) VALUES($1,$2,$3,'coding','completed','Fixture')",[task,project,user]);
    await c.query("INSERT INTO plans(id,task_id,approved_by,approved_at) VALUES($1,$2,$3,now())",[plan,task,user]);await c.query('UPDATE tasks SET active_plan_id=$2 WHERE id=$1',[task,plan]);
    await c.query("INSERT INTO task_artifacts(task_id,repository_id,base_commit_sha,base_branch,files,verification) VALUES($1,$2,$3,'main','[]','[]')",[task,repo,head]);
    await c.query("INSERT INTO pull_requests(repository_id,task_id,pr_number,branch_name,title,html_url,commit_sha) VALUES($1,$2,1,'ryvix/fixture','Fixture','https://github.com/fixture/repo/pull/1',$3)",[repo,task,head]);
    const target=(await c.query("INSERT INTO deployment_targets(repository_id,environment_id,provider_environment,endpoint_url) VALUES($1,$2,'production','https://fixture.example.test/health') RETURNING id",[repo,env])).rows[0].id;
    targetVersion=(await c.query('SELECT updated_at::text AS version FROM deployment_targets WHERE id=$1',[target])).rows[0].version;
    const githubConnector=(await c.query("INSERT INTO connectors(environment_id,name,connector_type,status) VALUES($1,'Fixture','github','active') RETURNING id",[env])).rows[0].id;
    const secret=(await c.query("SELECT vault.create_secret('fixture-token',$1) AS id",[`fixture-${githubConnector}`])).rows[0].id;
    await c.query("INSERT INTO connector_credentials(connector_id,credential_type,vault_secret_ref) VALUES($1,'oauth_token',$2)",[githubConnector,secret]);
    const query=(sql:string,args?:unknown[])=>c.query(sql==='BEGIN'?'SAVEPOINT fixture_store':sql==='COMMIT'?'RELEASE SAVEPOINT fixture_store':sql==='ROLLBACK'?'ROLLBACK TO SAVEPOINT fixture_store':sql,args);
    const pool={query,connect:async()=>({query,release(){}})} as unknown as Pool;
    let merges=0,clean=false,remoteHead=head,providerMerged=false,providerBase='main';const releases=new ReleaseStore(pool,async(path,token,method,body)=>{
      assert.equal(token,'fixture-token');if(method==='PUT'){merges++;assert.equal((body as any).sha,head);return {merged:true,sha:merge};}
      if(path.includes('/branches/'))return {protected:true};if(path.includes('/check-runs'))return {total_count:1,check_runs:[{status:'completed',conclusion:'success'}]};if(path.endsWith('/status?per_page=100'))return {total_count:0,statuses:[]};
      return {head:{sha:remoteHead},base:{ref:providerBase,repo:{full_name:'fixture/repo'}},state:'open',draft:false,merged:providerMerged,merge_commit_sha:merge,mergeable:true,mergeable_state:clean?'clean':'blocked'};
    });
    phase='release authorization and checks';await assert.rejects(releases.approve(randomUUID(),user,task,target,head,targetVersion),/access/);
    await assert.rejects(releases.approve(org,user,task,target,'c'.repeat(40),targetVersion),/changed/);
    await assert.rejects(releases.approve(org,user,task,target,head,targetVersion),/not ready/);assert.equal(merges,0);
    clean=true;remoteHead='c'.repeat(40);await assert.rejects(releases.approve(org,user,task,target,head,targetVersion),/not ready/);assert.equal(merges,0);remoteHead=head;
    assert.equal((await releases.approve(org,user,task,target,head,targetVersion)).status,'merged');await releases.approve(org,user,task,target,head,targetVersion);assert.equal(merges,1);
    await c.query("UPDATE release_requests SET status='unknown',merge_sha=NULL WHERE task_id=$1",[task]);providerMerged=true;providerBase='other';
    assert.equal((await releases.reconcile(org,user,task,target)).status,'unknown');providerBase='main';
    assert.equal((await releases.reconcile(org,user,task,target)).status,'merged');assert.equal(merges,1,'Reconciliation never dispatches a merge');
    phase='email opt-in and signed security';const sent:any[]=[];const email=new EmailNotifications(pool,async mail=>{sent.push(mail);return `fixture-email-${sent.length}`;});
    await assert.rejects(email.configure(randomUUID(),user,env,true,true),/access/);await email.configure(org,user,env,true,true);
    const observed=new Date().toISOString(),raw=Buffer.from(JSON.stringify({serverId:server,events:[{id:randomUUID(),type:'http_attack',severity:'high',observedAt:observed,summary:'Fixture detector observation'}]}));
    const timestamp=String(Date.now()),nonce=randomUUID(),headers=new Headers({'x-ryvix-timestamp':timestamp,'x-ryvix-nonce':nonce,'x-ryvix-signature':sign(null,signingMessage(raw,timestamp,nonce,'/api/connector/security'),device.privateKey).toString('base64')});
    assert.equal((await ingestSecuritySignals(pool,raw,headers)).received,1);await assert.rejects(ingestSecuritySignals(pool,raw,headers),/replay/);
    await email.enqueue();await email.enqueue();assert.equal((await email.history(org,user)).length,1);await email.dispatchOne();assert.equal(sent.length,1);assert.equal(sent[0].kind,'security_event');
    phase='deployment email only for approved deployed SHA';
    async function event(sha:string,state:string,id:number){await c.query(`INSERT INTO deployment_events(repository_id,delivery_id,github_status_id,github_deployment_id,commit_sha,environment,state,provider_created_at,payload_hash)
      VALUES($1,$2,$3,1,$4,'production',$5,now(),$6)`,[repo,randomUUID(),id,sha,state,'d'.repeat(64)]);}
    await event('e'.repeat(40),'success',1);await event(merge,'pending',2);await email.enqueue();assert.equal((await email.history(org,user)).length,1);
    await event(merge,'success',3);await email.enqueue();await email.dispatchOne();assert.equal(sent.length,2);assert.equal(sent[1].state,'success');assert.equal(sent[1].commit,merge);
    await c.query('UPDATE deployment_targets SET updated_at=clock_timestamp() WHERE id=$1',[target]);await event(merge,'success',30);await email.enqueue();assert.equal((await email.history(org,user)).length,2,'Changed mapping cannot redirect approved-release notifications');
    await c.query('UPDATE deployment_targets SET updated_at=$2 WHERE id=$1',[target,targetVersion]);
    phase='unsubscribe and revoked membership';await event(merge,'failure',4);await email.enqueue();await email.configure(org,user,env,false,false);await email.dispatchOne();assert.equal(sent.length,2);assert.ok((await email.history(org,user)).some(r=>r.status==='cancelled'));
    await c.query('ROLLBACK');assert.equal((await c.query('SELECT id FROM auth.users WHERE id=$1',[user])).rowCount,0);
    console.log('PASS release tenant/commit/check boundaries, one merge, verified recipient opt-in, signed security replay rejection, notification deduplication, approved deployment SHA matching and unsubscribe. All SQL fixtures rolled back; GitHub and email providers were injected. No PR merged and no email sent.');
  }catch(e:any){console.error(`Release/email SQL check failed at ${phase} (${String(e.code||e.name||'FAILED').replace(/[^a-z0-9_]/gi,'')}).`);process.exitCode=1;}
  finally{await c.query('ROLLBACK').catch(()=>{});await c.end().catch(()=>{});}
}
void main();
