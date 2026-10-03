import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID,randomInt} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client,type Pool} from 'pg';
import {WhatsAppAssistant} from '../backend/src/services/whatsapp-assistant';
import {ChannelInbox} from '../backend/src/services/channel-inbox';
import {WhatsAppOutbox} from '../backend/src/services/whatsapp-outbox';
import type {WhatsAppIntent} from '../ai/src/whatsapp-router';
async function main(){
  const defaults:Record<string,string>={};for(const f of ['.env','.env.local','web/.env.local'])if(fs.existsSync(f))Object.assign(defaults,parseEnv(fs.readFileSync(f,'utf8')));
  for(const [k,v] of Object.entries(defaults))if(process.env[k]===undefined)process.env[k]=v;
  process.env.RYVIX_PUBLIC_URL='https://fixture.example.test';delete process.env.WHATSAPP_ASSISTANT_UPDATE_TEMPLATE;
  const url=new URL(process.env.DATABASE_URL!);for(const k of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(k);
  const c=new Client({connectionString:url.toString(),connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT}});
  const user=randomUUID(),other=randomUUID(),project=randomUUID(),env=randomUUID(),connector=randomUUID(),repo=randomUUID();let phase='connect',sqlFailure='';
  try{await c.connect();await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='20s'");
    if(!(await c.query("SELECT to_regclass('public.whatsapp_assistant_sessions') AS t")).rows[0].t)await c.query(fs.readFileSync('supabase/migrations/20261003000004_whatsapp_assistant.sql','utf8'));
    for(const role of ['anon','authenticated'])for(const table of ['whatsapp_assistant_sessions','whatsapp_assistant_messages','whatsapp_assistant_proposals','whatsapp_assistant_outbox']){
      assert.equal((await c.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') AS allowed",[role,table])).rows[0].allowed,false);
      assert.equal((await c.query('SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass',[table])).rows[0].relrowsecurity,true);
    }
    phase='fixtures';for(const id of [user,other])await c.query("INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES($1,$2,now(),'{}')",[id,`rollback-${id}@example.test`]);
    const org=(await c.query('SELECT organization_id FROM profiles WHERE id=$1',[user])).rows[0].organization_id;
    await c.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'developer') ON CONFLICT DO NOTHING",[org,other]);
    await c.query("INSERT INTO projects(id,organization_id,name,slug) VALUES($1,$2,'Assistant fixture','assistant-fixture')",[project,org]);
    await c.query("INSERT INTO environments(id,project_id,name,slug) VALUES($1,$2,'Fixture','fixture')",[env,project]);
    await c.query("INSERT INTO connectors(id,environment_id,name,connector_type,status) VALUES($1,$2,'Fixture','whatsapp','active')",[connector,env]);
    const business='1999'+String(randomInt(100000000,999999999));
    await c.query("INSERT INTO channel_accounts(connector_id,owner_id,provider_subject) VALUES($1,$2,$3)",[connector,user,`whatsapp:${business}`]);
    const secret=(await c.query("SELECT vault.create_secret('fixture-only',$1) AS id",[`assistant-${connector}`])).rows[0].id;
    await c.query("INSERT INTO connector_credentials(connector_id,credential_type,vault_secret_ref) VALUES($1,'oauth_token',$2)",[connector,secret]);
    await c.query("INSERT INTO whatsapp_phone_links(connector_id,organization_id,user_id,phone) VALUES($1,$2,$3,'+15555550123'),($1,$2,$4,'+15555550124')",[connector,org,user,other]);
    await c.query("INSERT INTO repositories(id,project_id,github_repo_id,full_name,clone_url,default_branch) VALUES($1,$2,$3,'fixture/repo','https://github.com/fixture/repo.git','main')",[repo,project,7_000_000_000_000+randomInt(1e9)]);
    const github=(await c.query("INSERT INTO connectors(environment_id,name,connector_type,status) VALUES($1,'Fixture','github','active') RETURNING id",[env])).rows[0].id;
    await c.query("INSERT INTO connector_credentials(connector_id,credential_type,vault_secret_ref) VALUES($1,'oauth_token',$2)",[github,secret]);
    const query=async(sql:string,args?:unknown[])=>{try{return await c.query(sql==='BEGIN'?'SAVEPOINT assistant_store':sql==='COMMIT'?'RELEASE SAVEPOINT assistant_store':sql==='ROLLBACK'?'ROLLBACK TO SAVEPOINT assistant_store':sql,args);}catch(e:any){sqlFailure=String(e.code||e.name);throw e;}};
    const pool={query,connect:async()=>({query,release(){}})} as unknown as Pool;
    let intent:WhatsAppIntent={intent:'answer',reply:'Fixture answer'},calls=0,failSend=false,early=false,disableDuringModel=false;
    const store=new WhatsAppAssistant(pool,async input=>{calls++;assert.ok(!JSON.stringify(input).includes('fixture-only'));if(disableDuringModel)await store.configure(org,user,connector,false,false);
      return {decision:intent,provider:'fixture',model:'fixture',promptTokens:null,completionTokens:null,latencyMs:1};},async job=>{
        if(failSend)throw new Error('Ambiguous send');if(early)await new WhatsAppOutbox(pool).receipt({phone:business,recipient:job.recipient,id:`fixture-${job.id}`,status:'delivered'});return `fixture-${job.id}`;});
    const inbox=new ChannelInbox(pool);
    phase='configuration';await assert.rejects(store.configure(randomUUID(),user,connector,true,true),/first/);
    await store.configure(org,user,connector,true,true);await store.configure(org,other,connector,true,true);
    const session=(await store.dashboard(org,user)).sessions[0].id,otherSession=(await store.dashboard(org,other)).sessions[0].id;
    const receive=async(text:string,who=user,id=randomUUID(),timestamp=Math.floor(Date.now()/1000))=>{const phone=who===user?'15555550123':'15555550124';await inbox.receive(connector,id,phone,text);await store.receive(connector,id,phone,timestamp);return id;};
    phase='receive and duplicate';const message=await receive('Explain this project');await store.receive(connector,message,'15555550123',Math.floor(Date.now()/1000));
    assert.equal((await store.dashboard(org,user)).messages.length,1);assert.equal((await store.dashboard(org,other)).messages.length,0);
    await receive('old message',user,randomUUID(),Math.floor(Date.now()/1000)-90000);assert.equal((await store.dashboard(org,user)).messages.length,1);
    assert.equal(await store.processOne(session),true);assert.equal(calls,1);assert.equal((await store.dashboard(org,user)).messages[0].answer,'Fixture answer');
    phase='coding proposal';intent={intent:'coding',reply:'',repositoryId:repo,prompt:'Change only the login button color to blue.'};await receive('Make the login button blue');assert.equal(await store.processOne(session),true);
    const proposal=(await store.dashboard(org,user)).proposals[0];assert.equal(proposal.status,'pending');
    assert.equal((await c.query('SELECT count(*)::int AS n FROM repository_jobs WHERE repository_id=$1',[repo])).rows[0].n,0);
    phase='wrong user confirmation';await receive(`CONFIRM ${proposal.id}`,other);assert.equal(await store.processOne(otherSession),true);
    assert.equal((await c.query('SELECT count(*)::int AS n FROM repository_jobs WHERE repository_id=$1',[repo])).rows[0].n,0);
    phase='confirmed task and replay';await receive(`CONFIRM ${proposal.id}`);assert.equal(await store.processOne(session),true);
    await receive(`CONFIRM ${proposal.id}`);assert.equal(await store.processOne(session),true);
    assert.equal((await c.query('SELECT count(*)::int AS n FROM repository_jobs WHERE repository_id=$1',[repo])).rows[0].n,1);
    phase='notifications';await store.notifications();const count=(await c.query('SELECT count(*)::int AS n FROM whatsapp_assistant_outbox WHERE session_id=$1 AND proactive',[session])).rows[0].n;assert.ok(count>0);await store.notifications();assert.equal((await c.query('SELECT count(*)::int AS n FROM whatsapp_assistant_outbox WHERE session_id=$1 AND proactive',[session])).rows[0].n,count);
    phase='early receipt';early=true;assert.equal(await store.dispatchOne(session),true);await store.maintenance();assert.ok((await c.query("SELECT 1 FROM whatsapp_assistant_outbox WHERE session_id=$1 AND status='delivered'",[session])).rows.length);
    phase='ambiguous send';early=false;failSend=true;assert.equal(await store.dispatchOne(session),false);assert.ok((await c.query("SELECT 1 FROM whatsapp_assistant_outbox WHERE session_id=$1 AND status='unknown'",[session])).rows.length);failSend=false;
    phase='expiry';await receive('Another change');assert.equal(await store.processOne(session),true);const expired=(await store.dashboard(org,user)).proposals.find((p:any)=>p.status==='pending');
    await c.query("UPDATE whatsapp_assistant_proposals SET expires_at=now()-interval '1 second' WHERE id=$1",[expired.id]);await receive(`CONFIRM ${expired.id}`);assert.equal(await store.processOne(session),true);assert.equal((await c.query('SELECT count(*)::int AS n FROM repository_jobs WHERE repository_id=$1',[repo])).rows[0].n,1);
    phase='server and status';for(const kind of ['servers','status','approvals','connect'] as const){intent={intent:kind,reply:'Never trust model-provided status'};await receive(kind);assert.equal(await store.processOne(session),true);assert.ok(!(await store.dashboard(org,user)).messages[0].answer.includes('Never trust'));}
    phase='window policy';await c.query("UPDATE whatsapp_assistant_sessions SET last_inbound_at=now()-interval '2 days' WHERE id=$1",[session]);await store.dispatchOne(session);assert.ok((await c.query("SELECT 1 FROM whatsapp_assistant_outbox WHERE session_id=$1 AND status='window_closed'",[session])).rows.length);
    phase='disable during generation';intent={intent:'answer',reply:'Must not publish'};disableDuringModel=true;await receive('question');assert.equal(await store.processOne(session),false);
    assert.equal((await c.query("SELECT 1 FROM whatsapp_assistant_outbox WHERE session_id=$1 AND body='Must not publish'",[session])).rowCount,0);
    phase='quota';disableDuringModel=false;await store.configure(org,user,connector,true,true);await receive('quota question');await c.query('UPDATE chat_request_budgets SET requests=30 WHERE organization_id=$1 AND subject=$2',[org,`whatsapp-ai:${user}`]);const before=calls;assert.equal(await store.processOne(session),false);assert.equal(calls,before);
    phase='role downgrade';await c.query("UPDATE organization_members SET role='viewer' WHERE organization_id=$1 AND user_id=$2",[org,other]);assert.equal((await store.dashboard(org,other)).sessions.length,0);assert.equal(await store.dispatchOne(otherSession),false);
    phase='revocation';await c.query('DELETE FROM organization_members WHERE organization_id=$1 AND user_id=$2',[org,other]);assert.equal((await store.dashboard(org,other)).sessions.length,0);
    phase='unlink cascade';await c.query('DELETE FROM whatsapp_phone_links WHERE connector_id=$1 AND user_id=$2',[connector,user]);assert.equal((await c.query('SELECT 1 FROM whatsapp_assistant_sessions WHERE id=$1',[session])).rowCount,0);
    await c.query('ROLLBACK');assert.equal((await c.query('SELECT id FROM auth.users WHERE id=$1',[user])).rowCount,0);
    console.log('PASS assistant SQL: RLS, scope, opt-in, duplicate/stale messages, private history, coding confirmation and replay, notifications deduplication, early receipts, ambiguous send, expiry, status links, service window, opt-out race, quota, revocation and unlink cascade. All fixtures rolled back; providers injected.');
  }catch(e:any){console.error(`Assistant SQL failed at ${phase} (${String(e.code||e.name||'FAILED').replace(/[^a-z0-9_]/gi,'')}); last SQL error ${sqlFailure||'none'}.`);if(['42P01','42703','42883','23514','42P08'].includes(e.code))console.error(String(e.message).slice(0,200));process.exitCode=1;}
  finally{await c.query('ROLLBACK').catch(()=>{});await c.end();}
}
void main();
