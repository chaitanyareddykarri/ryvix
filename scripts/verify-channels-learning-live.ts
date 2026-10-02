import fs from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { Client, type Pool } from 'pg';
import { ChannelAccounts } from '../backend/src/services/channel-accounts';
import { ChannelInbox } from '../backend/src/services/channel-inbox';
import { LearningStore } from '../backend/src/services/learning-store';
import { NeuralThreatClassifier } from '../ai/src/neural-network';

// Explicit fixtures only: every change, including Vault writes, is rolled back.
async function main() {
  const defaults:Record<string,string>={};
  for(const file of ['.env','.env.local','web/.env.local'])if(fs.existsSync(file))Object.assign(defaults,parseEnv(fs.readFileSync(file,'utf8')));
  for(const [name,value] of Object.entries(defaults))if(process.env[name]===undefined)process.env[name]=value;
  const url=new URL(process.env.DATABASE_URL!);
  for(const name of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(name);
  const client=new Client({connectionString:url.toString(),connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT}});
  const users=[randomUUID(),randomUUID()],project=randomUUID(),environment=randomUUID(),repository=randomUUID();
  let phase='connect';
  try {
    await client.connect();await client.query('BEGIN');await client.query("SET LOCAL statement_timeout='15s'");
    phase='fixtures';
    for(const user of users)await client.query("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,'{}')",[user,`rollback-${user}@example.test`]);
    const org=(await client.query('SELECT organization_id FROM profiles WHERE id=$1',[users[0]])).rows[0].organization_id;
    const otherOrg=(await client.query('SELECT organization_id FROM profiles WHERE id=$1',[users[1]])).rows[0].organization_id;
    await client.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'admin')",[org,users[1]]);
    await client.query("INSERT INTO projects(id,organization_id,name,slug) VALUES($1,$2,'Rollback fixture',$3)",[project,org,`fixture-${project}`]);
    await client.query("INSERT INTO environments(id,project_id,name,slug) VALUES($1,$2,'Rollback fixture','fixture')",[environment,project]);
    await client.query("INSERT INTO repositories(id,project_id,github_repo_id,full_name,clone_url) VALUES($1,$2,$3,$4,$5)",
      [repository,project,8_000_000_000_000+randomBytes(4).readUInt32BE(),`fixture/${project}`,`https://github.com/fixture/${project}.git`]);
    const query=(sql:string,args?:unknown[])=>client.query(sql==='BEGIN'?'SAVEPOINT fixture_store':sql==='COMMIT'?'RELEASE SAVEPOINT fixture_store':sql==='ROLLBACK'?'ROLLBACK TO SAVEPOINT fixture_store':sql,args);
    const pool={query,connect:async()=>({query,release(){}})} as unknown as Pool;
    const accounts=new ChannelAccounts(pool),inbox=new ChannelInbox(pool),learning=new LearningStore(pool);
    phase='channel connection and reconnect';
    const subject=`fixture-${project}@example.test`;
    const first=await accounts.connect(org,users[0],environment,'gmail',subject,'fixture-only-not-a-provider-token','1');
    const second=await accounts.connect(org,users[0],environment,'gmail',subject,'fixture-only-replacement','2');
    assert.equal(first.connectorId,second.connectorId);
    await assert.rejects(accounts.credential(otherOrg,users[1],first.connectorId));
    phase='inbox deduplication and review';
    assert.equal((await inbox.receive(first.connectorId,'fixture-1','untrusted@example.test','Review this proposed change')).inserted,true);
    assert.equal((await inbox.receive(first.connectorId,'fixture-1','untrusted@example.test','Duplicate')).inserted,false);
    const items=await inbox.list(org,users[0]);assert.equal(items.length,1);
    assert.equal((await inbox.list(otherOrg,users[1])).length,0);
    await assert.rejects(inbox.decide(otherOrg,users[1],items[0].id,repository,true));
    await assert.rejects(inbox.decide(org,users[0],items[0].id,repository,true),/GitHub connection/);
    // A scoped credential fixture permits testing SQL queue creation, not GitHub access.
    const connector=(await client.query("INSERT INTO connectors(environment_id,name,connector_type,status) VALUES($1,'Fixture','github','active') RETURNING id",[environment])).rows[0].id;
    await client.query("INSERT INTO connector_credentials(connector_id,credential_type,vault_secret_ref) VALUES($1,'oauth_token',$2)",[connector,randomUUID()]);
    const accepted=await inbox.decide(org,users[0],items[0].id,repository,true);assert.ok(accepted.taskId);
    assert.equal((await client.query('SELECT id FROM tasks WHERE id=$1 AND project_id=$2',[accepted.taskId,project])).rowCount,1);
    assert.equal((await client.query('SELECT task_id FROM repository_jobs WHERE task_id=$1',[accepted.taskId])).rowCount,1);
    await assert.rejects(inbox.decide(org,users[0],items[0].id,repository,true),/already reviewed/);
    phase='reviewed learning ownership and partition isolation';
    const input={label:'SQL_INJECTION',partition:'train',event:{logs:['SQL injection fixture'],metrics:{cpuPercent:10}},provenance:'Explicit SQL verification fixture, not production training evidence.'};
    const sample=await learning.submit(org,users[0],project,input);
    await assert.rejects(learning.submit(org,users[0],project,{...input,partition:'test'}),/leakage/);
    await assert.rejects(learning.review(org,users[0],project,sample.id,true,'An author must not approve their own submitted example.'),/independent reviewer/);
    await assert.rejects(learning.review(otherOrg,users[1],project,sample.id,true,'Cross-tenant review must always be rejected.'),/denied/);
    await learning.review(org,users[1],project,sample.id,true,'Independent fixture reviewer verifies the test label and provenance.');
    assert.equal((await learning.list(org,users[0],project))[0].status,'approved');
    await assert.rejects(learning.predict(org,users[0],project,input.event),/No reviewed classifier/);
    phase='checkpoint gates, explicit promotion and rollback';
    // Deliberately seeded fixture checkpoints test lifecycle only, never accuracy.
    const weights=JSON.stringify(new NeuralThreatClassifier().exportWeights());
    const checkpoints:string[]=[];
    for(const hash of ['c','d'])checkpoints.push((await client.query(`INSERT INTO learning_checkpoints(project_id,dataset_hash,sample_ids,weights,metrics,eligible)
      VALUES($1,$2,$3,$4::jsonb,'{"fixture":true}',false) RETURNING id`,[project,hash.repeat(64),[sample.id],weights])).rows[0].id);
    await assert.rejects(learning.promote(org,users[0],project,checkpoints[0]),/Eligible/);
    await assert.rejects(learning.promote(otherOrg,users[1],project,checkpoints[0]),/denied/);
    await client.query('UPDATE learning_checkpoints SET eligible=true WHERE project_id=$1',[project]);
    await learning.promote(org,users[0],project,checkpoints[0]);
    await learning.promote(org,users[0],project,checkpoints[1]);
    assert.equal((await learning.predict(org,users[0],project,input.event)).checkpointId,checkpoints[1]);
    await learning.promote(org,users[0],project,'',true);
    assert.equal((await learning.predict(org,users[0],project,input.event)).checkpointId,checkpoints[0]);
    await client.query("UPDATE connectors SET status='revoked' WHERE id=$1",[first.connectorId]);
    assert.equal((await inbox.receive(first.connectorId,'fixture-2','sender','Revoked delivery')).inserted,false);
    await client.query('ROLLBACK');
    assert.equal((await client.query('SELECT id FROM auth.users WHERE id=ANY($1::uuid[])',[users])).rowCount,0);
    console.log('PASS real SQL channel reconnect, Vault replacement, deduplication, reviewed task creation, tenant isolation, independent learning review, partition leakage rejection, checkpoint gates, promotion and rollback. All fixtures rolled back; no provider delivery or quality score claimed.');
  }catch(error:any){console.error(`Channel/learning SQL verification failed during ${phase} (${String(error.code||'CHECK_FAILED').replace(/[^a-z0-9_]/gi,'')}).`);process.exitCode=1;}
  finally{await client.query('ROLLBACK').catch(()=>{});await client.end().catch(()=>{});}
}
void main();
