import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ModelUsage} from '../backend/src/services/model-usage';
import type {ModelAttempt} from '../ai/src/model-attempt';
const event:ModelAttempt={id:'11111111-1111-4111-8111-111111111111',provider:'fixture',model:'fixture',status:'started',usage:null,latencyMs:0};
test('coding and index starts bind exact worker claim and tenant; denied start throws',async()=>{
 for(const channel of ['coding','embedding_index'] as const){
  let called=false;
  const store=new ModelUsage({query:async(sql:string,args:unknown[])=>{
   called=true;assert.deepEqual(args.slice(0,3),['source','org','user']);assert.equal(args[7],'exact-claim');
   assert.match(sql,/p.organization_id=\$2/);assert.match(sql,/expires_at>now\(\)/);assert.match(sql,/::text=\$8/);
   return {rows:[]};
  }} as any);
  await assert.rejects(store.record({org:'org',user:'user',source:'source',channel},event),/claim/);assert.equal(called,false);
  await assert.rejects(store.record({org:'org',user:'user',source:'source',channel,claim:'exact-claim'},event),/unauthorized/);assert.equal(called,true);
 }
});
test('query start rechecks index owner and caller; finalization uses original scope only',async()=>{
 const sqls:string[]=[];
 const store=new ModelUsage({query:async(sql:string,args:unknown[])=>{sqls.push(sql);if(sql.startsWith('UPDATE')){assert.deepEqual(args.slice(0,5),[event.id,'org','user','embedding_query','source']);assert.match(sql,/status='started'/);}return {rows:[{id:event.id}]};}} as any);
 const scope={org:'org',user:'user',source:'source',channel:'embedding_query' as const};
 await store.record(scope,event);await store.record(scope,{...event,status:'failed'});
 assert.match(sqls[0],/a.user_id=s.configured_by/);assert.match(sqls[0],/s.enabled AND s.status='ready'/);assert.match(sqls[0],/m.user_id=\$3/);
});
