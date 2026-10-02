import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyWhatsAppSignature,whatsappMessages} from '../services/src/communication/whatsapp';
import {trainReviewedExamples} from '../ai/src/reviewed-training';
import {LearningStore} from '../backend/src/services/learning-store';
import {ChannelInbox} from '../backend/src/services/channel-inbox';
import {pollGmail} from '../backend/src/connectors/gmail-inbox';
import {rerankSources} from '../ai/src/semantic-reranking';
import {sanitizeLearningEvent} from '../ai/src/learning-event';
import type {Pool} from 'pg';

export async function testChannelsLearning(){
  assert.deepEqual(sanitizeLearningEvent({token:'fixture-secret-value',metrics:{cpuPercent:1},nested:[{api_key:'fixture-key-value'}]}),
    {token:'[REDACTED_SECRET]',metrics:{cpuPercent:1},nested:[{api_key:'[REDACTED_SECRET]'}]});
  const payload={object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{metadata:{phone_number_id:'123456'},messages:[{id:'fixture-message',from:'1234567890',type:'text',text:{body:'Review code'}}]}}]}]};
  const body=Buffer.from(JSON.stringify(payload)),secret='fixture-webhook-secret';
  const signature=`sha256=${createHmac('sha256',secret).update(body).digest('hex')}`;
  assert.ok(verifyWhatsAppSignature(body,signature,secret));
  assert.ok(!verifyWhatsAppSignature(Buffer.from('tampered'),signature,secret));
  assert.ok(!verifyWhatsAppSignature(body,null,secret));
  assert.equal(whatsappMessages(payload)[0].text,'Review code');
  assert.throws(()=>whatsappMessages({object:'other'}));
  assert.throws(()=>trainReviewedExamples([]),/At least/);
  assert.throws(()=>trainReviewedExamples([{status:'pending'}] as any),/Reviewed/);
  const calls:string[]=[];
  const client={release(){},query:async(sql:string)=>{calls.push(sql);if(sql.includes('SELECT m.role'))return {rows:[{role:'viewer'}]};return {rows:[]};}};
  const store=new LearningStore({connect:async()=>client} as unknown as Pool);
  await assert.rejects(store.review('org','user','project','sample',true,'Reviewed independently against real evidence'),/denied/);
  assert.ok(!calls.some(sql=>sql.startsWith('UPDATE learning_examples')));
  const inbox=new ChannelInbox({connect:async()=>client} as unknown as Pool);
  await assert.rejects(inbox.decide('org','other','message','repo',true),/denied/);
  assert.ok(!calls.some(sql=>sql.includes('INSERT INTO tasks')));
  const savedFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY,oldModel=process.env.GEMINI_EMBEDDING_MODEL;
  try{
    const providerCalls:string[]=[];const sqlCalls:string[]=[];
    const pool={query:async(sql:string,args:unknown[])=>{
      sqlCalls.push(sql);
      if(sql.includes('decrypted_secret'))return {rows:[{connector_type:'gmail',cursor:'10',decrypted_secret:JSON.stringify({refresh_token:'fixture-refresh'})}]};
      if(sql.includes('INSERT INTO channel_inbox')){assert.ok(sql.includes("c.status='active'"));assert.equal(args[1],'m1');return {rows:[{id:'inbox'}]};}
      return {rows:[]};
    }};
    globalThis.fetch=async(url)=>{
      providerCalls.push(String(url));let data:any;
      if(String(url).includes('/token'))data={access_token:'fixture-access'};
      else if(String(url).includes('/history?'))data={historyId:'11',history:[{messagesAdded:[{message:{id:'m1'}},{message:{id:'m1'}}]}]};
      else data={labelIds:['INBOX'],payload:{mimeType:'text/plain',headers:[{name:'From',value:'untrusted@example.test'}],body:{data:Buffer.from('Proposed coding instruction').toString('base64url')}}};
      return Response.json(data);
    };
    assert.equal((await pollGmail(pool as unknown as Pool,'org','user','connector')).received,1);
    assert.equal(providerCalls.length,3,'Duplicate message IDs fetched once');
    assert.ok(sqlCalls.at(-1)?.includes('AND cursor=$2'),'Cursor is compare-and-swap');
    process.env.GEMINI_API_KEY='fixture';process.env.GEMINI_EMBEDDING_MODEL='fixture-model';
    globalThis.fetch=async()=>Response.json({embeddings:[{values:[1,0]},{values:[0,1]},{values:[1,0]}]});
    const sources=[{id:'a',title:'A',excerpt:'A'},{id:'b',title:'B',excerpt:'B'}];
    assert.equal((await rerankSources('question',sources)).sources[0].id,'b');
    globalThis.fetch=async()=>Response.json({embeddings:[{values:[]}]});
    assert.match((await rerankSources('question',sources)).mode,/unavailable/);
  }finally{
    globalThis.fetch=savedFetch;
    if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;
    if(oldModel===undefined)delete process.env.GEMINI_EMBEDDING_MODEL;else process.env.GEMINI_EMBEDDING_MODEL=oldModel;
  }
}
