import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client,type Pool} from 'pg';
import {WhatsAppPhone} from '../backend/src/services/whatsapp-phone';
import {ChannelInbox} from '../backend/src/services/channel-inbox';
async function main(){
  const defaults:Record<string,string>={};for(const f of ['.env','.env.local','web/.env.local'])if(fs.existsSync(f))Object.assign(defaults,parseEnv(fs.readFileSync(f,'utf8')));
  for(const [k,v] of Object.entries(defaults))if(process.env[k]===undefined)process.env[k]=v;
  process.env.WHATSAPP_OTP_SECRET='rollback-fixture-only-not-a-deployment-secret';process.env.WHATSAPP_OTP_TEMPLATE='fixture_otp';process.env.WHATSAPP_OTP_LANGUAGE='en_US';process.env.WHATSAPP_GRAPH_VERSION='v23.0';
  const url=new URL(process.env.DATABASE_URL!);for(const k of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(k);
  const c=new Client({connectionString:url.toString(),connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT}});
  const user=randomUUID(),other=randomUUID(),project=randomUUID(),env=randomUUID(),connector=randomUUID();let phase='connect';
  try{await c.connect();await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='20s'");
    if(!(await c.query("SELECT to_regclass('public.whatsapp_phone_links') AS t")).rows[0].t)await c.query(fs.readFileSync('supabase/migrations/20261003000003_whatsapp_phone_identity.sql','utf8'));
    for(const role of ['anon','authenticated'])for(const table of ['whatsapp_phone_links','whatsapp_phone_challenges']){
      assert.equal((await c.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') AS allowed",[role,table])).rows[0].allowed,false);
      assert.equal((await c.query('SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass',[table])).rows[0].relrowsecurity,true);
    }
    phase='fixtures';for(const id of [user,other])await c.query("INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES($1,$2,now(),'{}')",[id,`rollback-${id}@example.test`]);
    const org=(await c.query('SELECT organization_id FROM profiles WHERE id=$1',[user])).rows[0].organization_id;
    await c.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'developer') ON CONFLICT DO NOTHING",[org,other]);
    await c.query("INSERT INTO projects(id,organization_id,name,slug) VALUES($1,$2,'Phone fixture','phone-fixture')",[project,org]);
    await c.query("INSERT INTO environments(id,project_id,name,slug) VALUES($1,$2,'Fixture','fixture')",[env,project]);
    await c.query("INSERT INTO connectors(id,environment_id,name,connector_type,status) VALUES($1,$2,'Fixture','whatsapp','active')",[connector,env]);
    await c.query("INSERT INTO channel_accounts(connector_id,owner_id,provider_subject) VALUES($1,$2,$3)",[connector,user,`whatsapp:fixture-${connector}`]);
    const secret=(await c.query("SELECT vault.create_secret('fixture-only',$1) AS id",[`phone-${connector}`])).rows[0].id;
    await c.query("INSERT INTO connector_credentials(connector_id,credential_type,vault_secret_ref) VALUES($1,'oauth_token',$2)",[connector,secret]);
    const query=(sql:string,args?:unknown[])=>c.query(sql==='BEGIN'?'SAVEPOINT phone_store':sql==='COMMIT'?'RELEASE SAVEPOINT phone_store':sql==='ROLLBACK'?'ROLLBACK TO SAVEPOINT phone_store':sql,args);
    const pool={query,connect:async()=>({query,release(){}})} as unknown as Pool;
    let code='',sends=0,fail=false;const store=new WhatsAppPhone(pool,async input=>{code=input.code;sends++;if(fail)throw new Error('Ambiguous provider timeout');});
    const resetCooldown=()=>c.query("UPDATE whatsapp_phone_challenges SET created_at=now()-interval '2 minutes' WHERE connector_id=$1",[connector]);
    phase='scope and budget';await assert.rejects(store.request(randomUUID(),user,connector,'+15555550123'),/denied/);assert.equal(sends,0);
    const first=await store.request(org,user,connector,'+15555550123');assert.equal(first.delivery,'accepted');
    assert.notEqual((await c.query('SELECT code_digest FROM whatsapp_phone_challenges WHERE id=$1',[first.challengeId])).rows[0].code_digest,code);
    await assert.rejects(store.request(org,user,connector,'+15555550123'),/minute/);assert.equal(sends,1);
    await assert.rejects(store.verify(org,other,connector,first.challengeId,code),/invalid/);
    const wrong=code==='000000'?'000001':'000000';for(let i=0;i<5;i++)await assert.rejects(store.verify(org,user,connector,first.challengeId,wrong),/invalid/);
    await assert.rejects(store.verify(org,user,connector,first.challengeId,code),/invalid/);
    assert.equal((await c.query('SELECT attempts FROM whatsapp_phone_challenges WHERE id=$1',[first.challengeId])).rows[0].attempts,5);
    phase='resend and single use';await resetCooldown();const second=await store.request(org,user,connector,'+15555550123');
    await assert.rejects(store.verify(org,user,connector,first.challengeId,code),/invalid/);
    await store.verify(org,user,connector,second.challengeId,code);await assert.rejects(store.verify(org,user,connector,second.challengeId,code),/invalid/);
    assert.equal((await store.list(org,user))[0].phone,'+15555550123');assert.equal((await store.list(org,other))[0].phone,null);
    phase='inbound identity';const inbox=new ChannelInbox(pool);await inbox.receive(connector,'fixture-message','15555550123','A test proposal');
    assert.equal((await c.query('SELECT sender_user_id FROM channel_inbox WHERE connector_id=$1',[connector])).rows[0].sender_user_id,user);
    await c.query('DELETE FROM organization_members WHERE organization_id=$1 AND user_id=$2',[org,other]);
    await assert.rejects(store.request(org,other,connector,'+15555550124'),/denied/);
    await c.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'developer')",[org,other]);
    phase='duplicate phone';const duplicate=await store.request(org,other,connector,'+15555550123');await assert.rejects(store.verify(org,other,connector,duplicate.challengeId,code),/unavailable/);
    phase='unlink';await store.unlink(org,user,connector);assert.equal((await store.list(org,user))[0].phone,null);
    assert.equal((await c.query('SELECT sender_user_id FROM channel_inbox WHERE connector_id=$1',[connector])).rows[0].sender_user_id,null);
    phase='unknown delivery and expiry';fail=true;const uncertain=await store.request(org,user,connector,'+15555550124');assert.equal(uncertain.delivery,'unknown');
    await c.query("UPDATE whatsapp_phone_challenges SET expires_at=now()-interval '1 second' WHERE id=$1",[uncertain.challengeId]);
    await assert.rejects(store.verify(org,user,connector,uncertain.challengeId,code),/invalid/);
    phase='durable send limit';await c.query("UPDATE chat_request_budgets SET requests=5 WHERE organization_id=$1 AND subject=$2",[org,`wa-otp-user:${user}`]);await resetCooldown();
    const before=sends;await assert.rejects(store.request(org,user,connector,'+15555550124'),/limit/);assert.equal(sends,before);
    await c.query('ROLLBACK');assert.equal((await c.query('SELECT id FROM auth.users WHERE id=$1',[user])).rowCount,0);
    console.log('PASS phone SQL: RLS, tenant denial, cooldown, five persisted attempts, resend invalidation, single use, phone collision, inbox attribution, revocation, unlink, unknown delivery, expiry and send limits. Fixtures rolled back; no Meta requests.');
  }catch(e:any){console.error(`Phone SQL failed at ${phase} (${String(e.code||e.name||'FAILED').replace(/[^a-z0-9_]/gi,'')}).`);if(['42P01','42703','42883','23514'].includes(e.code))console.error(String(e.message).slice(0,180));process.exitCode=1;}
  finally{await c.query('ROLLBACK').catch(()=>{});await c.end();}
}
void main();
