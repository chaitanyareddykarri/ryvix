import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client,type Pool} from 'pg';
import {ChannelAccounts} from '../backend/src/services/channel-accounts';
import {ChannelInbox} from '../backend/src/services/channel-inbox';
import {GmailReplies} from '../backend/src/services/gmail-replies';
import {acceptGmailPush} from '../backend/src/services/gmail-push';
import {IncidentNotifications} from '../backend/src/services/incident-notifications';
import {ExternalTraining} from '../backend/src/services/external-training';

// All fixtures and optional schema preview are rolled back. Provider calls are intercepted.
async function main(){
  for(const file of ['.env','.env.local','web/.env.local'])if(fs.existsSync(file))for(const [k,v] of Object.entries(parseEnv(fs.readFileSync(file,'utf8'))))if(process.env[k]===undefined)process.env[k]=v;
  const url=new URL(process.env.DATABASE_URL!);for(const k of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(k);
  const c=new Client({connectionString:url.toString(),ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT},connectionTimeoutMillis:10000});
  const original=global.fetch;let phase='connect';
  const project=randomUUID(),environment=randomUUID(),users=[randomUUID(),randomUUID()];
  try{await c.connect();await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='20s'");
    if(process.argv.includes('--schema-preview'))for(const name of ['20261003000005_response_usage.sql','20261003000006_repository_semantics.sql','20261003000007_gmail_push_replies.sql','20261004000001_incident_notifications.sql','20261004000002_external_training_examples.sql'])await c.query(fs.readFileSync('supabase/migrations/'+name,'utf8'));
    phase='fixtures';
    for(const user of users)await c.query("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,'{}')",[user,`rollback-${user}@example.test`]);
    const org=(await c.query('SELECT organization_id FROM profiles WHERE id=$1',[users[0]])).rows[0].organization_id;
    const other=(await c.query('SELECT organization_id FROM profiles WHERE id=$1',[users[1]])).rows[0].organization_id;
    await c.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'admin')",[org,users[1]]);
    await c.query("INSERT INTO projects(id,organization_id,name,slug) VALUES($1,$2,'Rollback fixture',$3)",[project,org,`fixture-${project}`]);
    await c.query("INSERT INTO environments(id,project_id,name,slug) VALUES($1,$2,'Rollback fixture','fixture')",[environment,project]);
    const query=(sql:string,args?:unknown[])=>c.query(sql==='BEGIN'?'SAVEPOINT capability_store':sql==='COMMIT'?'RELEASE SAVEPOINT capability_store':sql==='ROLLBACK'?'ROLLBACK TO SAVEPOINT capability_store':sql.replace("SELECT * FROM incident_notification_outbox WHERE status='pending'",`SELECT * FROM incident_notification_outbox WHERE project_id='${project}' AND status='pending'`),args);
    const pool={query,connect:async()=>({query,release(){}})} as unknown as Pool;
    phase='Gmail draft exact approval and replay';let sends=0;
    global.fetch=async input=>{const address=String(input);if(address==='https://oauth2.googleapis.com/token')return Response.json({access_token:'fixture'});
      if(address.endsWith('/messages/send')){sends++;return Response.json({id:'fixture-message'});}
      if(address.includes('/messages/')&&address.endsWith('?format=metadata'))return Response.json({threadId:'fixture-thread',payload:{headers:[{name:'From',value:'sender@example.test'},{name:'Subject',value:'Fixture'},{name:'Message-ID',value:'<fixture@example.test>'}]}});
      throw new Error('Unexpected external request intercepted');};
    const connector=(await new ChannelAccounts(pool).connect(org,users[0],environment,'gmail',`${project}@example.test`,JSON.stringify({refresh_token:'fixture'}),'1',true)).connectorId;
    const inbox=new ChannelInbox(pool);await inbox.receive(connector,'fixture-incoming','sender@example.test','Please consider this fixture email.');
    const item=(await inbox.list(org,users[0]))[0];const replies=new GmailReplies(pool);
    await assert.rejects(replies.draft(other,users[1],item.id,'Cross tenant must fail'));
    const draft=await replies.draft(org,users[0],item.id,'This is a manually reviewed fixture response.');assert.equal(sends,0);
    assert.equal((await replies.decide(org,users[0],draft.id,true)).status,'accepted');assert.equal(sends,1);
    await assert.rejects(replies.decide(org,users[0],draft.id,true));assert.equal(sends,1);
    const revoked=await replies.draft(org,users[0],item.id,'This draft must not send after revocation.');
    await c.query('UPDATE channel_accounts SET gmail_send_enabled=false WHERE connector_id=$1',[connector]);
    await assert.rejects(replies.decide(org,users[0],revoked.id,true));assert.equal(sends,1);
    phase='Gmail push deduplication';
    process.env.GMAIL_PUBSUB_AUDIENCE='https://fixture.example/push';process.env.GMAIL_PUBSUB_SUBSCRIPTION='projects/fixture/subscriptions/gmail';process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT='fixture@example.iam.gserviceaccount.com';
    await c.query("UPDATE channel_accounts SET gmail_watch_expires_at=now()+interval '1 day' WHERE connector_id=$1",[connector]);
    const messageId=randomUUID(),body={subscription:process.env.GMAIL_PUBSUB_SUBSCRIPTION,message:{messageId,data:Buffer.from(JSON.stringify({emailAddress:`${project}@example.test`,historyId:'9999'})).toString('base64')}};
    const verify=async()=>({iss:'https://accounts.google.com',aud:process.env.GMAIL_PUBSUB_AUDIENCE!,email:process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT,email_verified:true,sub:'fixture',iat:1,exp:2});
    await acceptGmailPush(pool,'Bearer fixture',body,verify);await acceptGmailPush(pool,'Bearer fixture',body,verify);
    assert.equal((await c.query('SELECT count(*)::int n FROM gmail_push_events WHERE provider_message_id=$1',[messageId])).rows[0].n,1);
    assert.equal((await c.query('SELECT cursor FROM channel_accounts WHERE connector_id=$1',[connector])).rows[0].cursor,'1');
    phase='Incident queue deduplication and dispatch';
    const incident=(await c.query("INSERT INTO incidents(environment_id,title,incident_type,severity) VALUES($1,'Fixture','service_crash','P1_critical') RETURNING id",[environment])).rows[0].id;
    const secret=(await c.query('SELECT vault.create_secret($1,$2) AS id',['fixture-only',`fixture-${project}`])).rows[0].id;
    process.env.RYVIX_INCIDENT_NOTIFICATION_TARGETS=JSON.stringify([{id:randomUUID(),environmentId:environment,ownerId:users[0],vaultSecretRef:secret,provider:'slack',destination:'C123456789',optedIn:true}]);
    let notifications=0;const outbox=new IncidentNotifications(pool,async job=>{assert.equal(job.incident,incident);notifications++;return 'fixture-accepted';});
    await outbox.enqueue();await outbox.enqueue();assert.equal((await outbox.list(org,users[0])).length,1);
    assert.equal((await outbox.list(other,users[1])).length,0);await outbox.dispatchOne();await outbox.dispatchOne();assert.equal(notifications,1);
    await c.query("INSERT INTO incidents(environment_id,title,incident_type,severity) VALUES($1,'Cancelled fixture','service_crash','P1_critical')",[environment]);
    await outbox.enqueue();process.env.RYVIX_INCIDENT_NOTIFICATION_TARGETS='[]';await outbox.dispatchOne();
    assert.equal(notifications,1);assert.ok((await outbox.list(org,users[0])).some(r=>r.status==='cancelled'));
    phase='Independent external training review and dataset gates';const training=new ExternalTraining(pool);
    const input={question:'How do I investigate this reviewed fixture?',answer:'Inspect the relevant evidence and request approval before changes.',provenance:'Explicit rollback fixture, never real training evidence.',evidenceGroup:'fixture-group',partition:'train',externalTrainingConsent:true};
    const sample=await training.submit(org,users[0],project,input);
    await assert.rejects(training.review(org,users[0],project,sample.id,true,'Author cannot approve their own example.'));
    await assert.rejects(training.submit(org,users[0],project,{...input,question:'A different question from the same evidence group?',partition:'test'}));
    await assert.rejects(training.list(other,users[1],project));
    await training.review(org,users[1],project,sample.id,true,'Independent fixture review only, not quality evidence.');
    await assert.rejects(training.export(org,users[0],project,'unselected-provider','unselected-model'),/At least/);
    await training.revoke(org,users[0],project,sample.id);assert.equal((await training.list(org,users[0],project))[0].status,'rejected');
    // Explicit rollback-only prepared rows test bundle mechanics, never model quality.
    for(const [partition,count] of [['train',20],['validation',5],['test',5]] as const){
      await c.query(`INSERT INTO external_training_examples(project_id,author_id,reviewer_id,question,answer,question_hash,evidence_group,provenance,partition,external_training_consent,status)
        SELECT $1,$2,$3,'Fixture question '||$4||n,'Fixture answer for mechanics only',encode(sha256(($4||n)::bytea),'hex'),$4||n,
        'Rollback-only fixture, not actual training evidence',$4,true,'approved' FROM generate_series(1,$5::int) n`,[project,users[0],users[1],partition,count]);
    }
    const bundle=await training.export(org,users[0],project,'unselected-provider','unselected-model');
    assert.deepEqual(bundle.manifest.counts,{train:20,validation:5,test:5});assert.equal(bundle.manifest.providerJobSubmitted,false);
    assert.equal(bundle.files.test.trim().split('\n').length,5);assert.ok(!bundle.files.train.includes('Fixture question test'));
    console.log('PASS Gmail approval/replay/scope, push dedup/cursor, incident outbox and external training review gates. All fixtures rolled back; no provider contacted.');
  }catch(error){console.error(`Capability SQL verification failed during ${phase}: ${error instanceof Error?error.message:'unknown'}`);process.exitCode=1;}
  finally{global.fetch=original;await c.query('ROLLBACK').catch(()=>{});await c.end();}
}
void main();
