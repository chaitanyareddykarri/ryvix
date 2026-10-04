import assert from 'node:assert/strict';
import {acceptGmailPush} from '../backend/src/services/gmail-push';
import {gmailReplyMime,replyMailbox} from '../backend/src/services/gmail-replies';
import {gmailWorkerCycle} from '../backend/src/services/gmail-maintenance';

export async function testGmailWorkflows(){
  assert.equal(replyMailbox('Example <user@example.com>'),'user@example.com');
  for(const bad of ['a@example.com,b@example.com','a@example.com\r\nBcc: spy@example.com'])assert.throws(()=>replyMailbox(bad));
  assert.throws(()=>gmailReplyMime({recipient:'user@example.com',subject:'test',body:'hello',reply_to_message_id:'<id>\r\nBcc: spy@example.com'}));
  const mime=Buffer.from(gmailReplyMime({recipient:'user@example.com',subject:'Re: test',body:'Hello',reply_to_message_id:'<id@example.com>'}),'base64url').toString();
  assert.ok(mime.includes('In-Reply-To: <id@example.com>'));assert.ok(mime.endsWith(Buffer.from('Hello').toString('base64')));
  const keys=['GMAIL_PUBSUB_AUDIENCE','GMAIL_PUBSUB_SERVICE_ACCOUNT','GMAIL_PUBSUB_SUBSCRIPTION'];
  const previous=keys.map(k=>process.env[k]);
  try{
    process.env.GMAIL_PUBSUB_AUDIENCE='https://app.example/api/webhooks/gmail';process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT='push@example.iam.gserviceaccount.com';process.env.GMAIL_PUBSUB_SUBSCRIPTION='projects/example/subscriptions/gmail';
    let writes=0;const pool={query:async()=>{writes++;return {rows:[]};}} as any;
    const envelope={subscription:process.env.GMAIL_PUBSUB_SUBSCRIPTION,message:{messageId:'event-1',data:Buffer.from(JSON.stringify({emailAddress:'user@example.com',historyId:'123'})).toString('base64')}};
    const claims={iss:'https://accounts.google.com',email:process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT,email_verified:true,aud:process.env.GMAIL_PUBSUB_AUDIENCE,sub:'subject',iat:1,exp:2};
    await assert.rejects(()=>acceptGmailPush(pool,null,envelope,async()=>claims));
    await assert.rejects(()=>acceptGmailPush(pool,'Bearer token',envelope,async()=>({...claims,email:'attacker@example.com'})));
    await assert.rejects(()=>acceptGmailPush(pool,'Bearer token',{...envelope,subscription:'wrong'},async()=>claims));
    assert.equal(writes,0);await acceptGmailPush(pool,'Bearer token',envelope,async()=>claims);assert.equal(writes,1);
  }finally{keys.forEach((k,i)=>{if(previous[i]===undefined)delete process.env[k];else process.env[k]=previous[i];});}
  const queries:Array<{sql:string;args:any}>=[];
  const pool={query:async(sql:string,args:any)=>{queries.push({sql,args});return {rows:sql.startsWith('SELECT connector_id')?[{connector_id:'connector',provider_message_id:'event-before-poll'}]:[]};}} as any;
  const signal=new AbortController().signal;
  await gmailWorkerCycle(pool,['connector'],signal,false,async()=>({polled:0,failed:1}));
  assert.equal(queries.length,1,'failed poll must retain notification');queries.length=0;
  await gmailWorkerCycle(pool,['connector'],signal,false,async()=>({polled:1,failed:0}));
  assert.deepEqual(queries[1].args,['connector',['event-before-poll']]);
}
