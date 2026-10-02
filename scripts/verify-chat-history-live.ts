import fs from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { Client, type Pool } from 'pg';
import { ConversationStore } from '../backend/src/services/conversation-store';
import vm from 'node:vm';
import ts from 'typescript';
import { ContextBuilder } from '../ai/src/context/context-builder';
import { SettingsStore } from '../backend/src/services/settings-store';

async function main() {
  const defaults: Record<string,string> = {};
  for (const file of ['.env','.env.local','web/.env.local']) if (fs.existsSync(file)) Object.assign(defaults,parseEnv(fs.readFileSync(file,'utf8')));
  for (const [key,value] of Object.entries(defaults)) if (process.env[key]===undefined) process.env[key]=value;
  const url=new URL(process.env.DATABASE_URL!);
  for(const key of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(key);
  const client=new Client({connectionString:url.toString(),connectionTimeoutMillis:10000,
    ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT}});
  const users=[randomUUID(),randomUUID()];
  try {
    await client.connect(); await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout='15s'");
    const organizations:string[]=[];
    for (const user of users) {
      await client.query(`INSERT INTO auth.users(id,email,raw_user_meta_data)
        VALUES($1,$2,'{"full_name":"Chat rollback test"}'::jsonb)`,[user,`rollback-${user}@example.test`]);
      organizations.push((await client.query('SELECT organization_id FROM profiles WHERE id=$1',[user])).rows[0].organization_id);
    }
    // Adapt store transactions to savepoints so even successful writes remain in
    // this one outer rollback transaction. No real accounts or messages are used.
    const query=async (sql:string,args?:unknown[])=>client.query(sql==='BEGIN' ? 'SAVEPOINT chat_store' :
      sql==='COMMIT' ? 'RELEASE SAVEPOINT chat_store' : sql==='ROLLBACK' ? 'ROLLBACK TO SAVEPOINT chat_store' : sql,args);
    const store=new ConversationStore({connect:async()=>({query,release(){}}),query} as unknown as Pool);
    // Execute the production retrieval SQL against the actual schema with fixture
    // ownership, without loading the web-only connection pool or reading real users.
    const retrieval: any = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('web/utils/chat-retrieval.ts','utf8'),{
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
    }).outputText,{exports:retrieval,require(name:string){
      if(name==='server-only') return {};
      if(name.endsWith('/context-builder')) return {ContextBuilder};
      if(name==='./direct-db') return {queryDirectDb:async(sql:string,args:unknown[])=>(await client.query(sql,args)).rows};
      throw new Error('Unexpected retrieval dependency');
    }});
    assert.equal((await retrieval.retrieveChatSources(organizations[0],users[0],'database repository')).length,0);
    const first=await store.begin(organizations[0],users[0]);
    await assert.rejects(store.begin(organizations[0],users[0],first.id));
    await store.finish(first.id,first.lease,organizations[0],users[0],'Which server?','The api-east server.');
    const follow=await store.begin(organizations[0],users[0],first.id);
    assert.equal(follow.history.length,2);
    assert.equal(follow.history[1].content,'The api-east server.');
    await store.release(follow.id,follow.lease);
    await assert.rejects(store.begin(organizations[1],users[1],first.id));
    await client.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'viewer')",[organizations[0],users[1]]);
    await assert.rejects(store.begin(organizations[0],users[1],first.id));
    await client.query('SET LOCAL ROLE authenticated');
    await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[users[1]]);
    await client.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:users[1],role:'authenticated'})]);
    assert.equal((await client.query('SELECT id FROM chat_conversations WHERE id=$1',[first.id])).rowCount,0);
    assert.equal((await client.query('SELECT id FROM chat_turns WHERE conversation_id=$1',[first.id])).rowCount,0);
    await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[users[0]]);
    await client.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:users[0],role:'authenticated'})]);
    assert.equal((await client.query('SELECT id FROM chat_turns WHERE conversation_id=$1',[first.id])).rowCount,1);
    await client.query('SAVEPOINT browser_write');
    let denied=false;
    try { await client.query("INSERT INTO chat_turns(conversation_id,question,answer) VALUES($1,'forged','forged')",[first.id]); }
    catch(error:any) { denied=error.code==='42501'; }
    await client.query('ROLLBACK TO SAVEPOINT browser_write'); assert.ok(denied);
    await client.query('RESET ROLE');
    const settings=new SettingsStore({connect:async()=>({query,release(){}})} as unknown as Pool);
    await settings.mutate(organizations[0],users[0],{action:'update_org',orgName:'Rollback settings test'});
    assert.equal((await client.query('SELECT count(*)::int AS n FROM organization_audit_events WHERE organization_id=$1',[organizations[0]])).rows[0].n,1);
    await client.query('UPDATE chat_request_budgets SET requests=60 WHERE organization_id=$1 AND subject=$2',[organizations[0],`user:${users[0]}`]);
    await assert.rejects(store.begin(organizations[0],users[0],first.id),/Hourly chat/);
    await client.query("UPDATE organization_members SET role='viewer' WHERE organization_id=$1 AND user_id=$2",[organizations[0],users[0]]);
    await assert.rejects(settings.mutate(organizations[0],users[0],{action:'generate_key'}),/Forbidden/);
    await client.query('DELETE FROM organization_members WHERE organization_id=$1 AND user_id=$2',[organizations[0],users[0]]);
    await assert.rejects(store.begin(organizations[0],users[0],first.id));
    await client.query('ROLLBACK');
    assert.equal((await client.query('SELECT id FROM auth.users WHERE id=ANY($1::uuid[])',[users])).rowCount,0);
    assert.equal((await client.query('SELECT id FROM chat_conversations WHERE id=$1',[first.id])).rowCount,0);
    console.log('PASS real SQL history persistence, follow-up retrieval, retrieval SQL schema compatibility, busy leases, cross-tenant/same-tenant user isolation, browser write denial and revoked membership. Fixtures rolled back. Not a provider-JWT login test.');
  } finally { await client.query('ROLLBACK').catch(()=>{});await client.end().catch(()=>{}); }
}
main().catch(error=>{console.error(`Chat SQL verification failed (${String(error.code||'CHECK_FAILED').replace(/[^a-z0-9_]/gi,'')}).`);process.exitCode=1;});
