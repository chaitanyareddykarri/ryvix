import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseHostLogs, detectLogSignals,ingestHostLogs} from '../backend/src/services/host-logs';
import {generateKeyPairSync,randomUUID,sign} from 'node:crypto';
import {signingMessage} from '../backend/src/services/device-protocol';
const now=Date.now();
const entry=(message:string)=>({id:crypto.randomUUID(),source:'sshd',timestamp:new Date(now).toISOString(),message,severity:'warning'});
test('host logs reject stale, oversized and invalid batches; redact credentials',()=>{
  const payload={serverId:crypto.randomUUID(),entries:[entry('Authorization: Bearer abcdefghijklmnop password=short')]};
  const parsed=parseHostLogs(Buffer.from(JSON.stringify(payload)),now);
  assert.ok(!parsed.entries[0].message.includes('abcdefghijklmnop'));
  assert.ok(!parsed.entries[0].message.includes('short'));
  assert.throws(()=>parseHostLogs(Buffer.from(JSON.stringify({...payload,entries:[{...entry('x'),timestamp:'2000-01-01'}]})),now));
  assert.throws(()=>parseHostLogs(Buffer.from(JSON.stringify({...payload,entries:Array(51).fill(entry('x'))})),now));
});
test('signed log ingestion fails closed for revoked identity, replay, rate and bad signatures',async()=>{
 const pair=generateKeyPairSync('ed25519'),publicKey=pair.publicKey.export({format:'der',type:'spki'}).toString('base64');
 let mode='ok';const calls:string[]=[];
 const client={release(){},async query(sql:string,args?:unknown[]){calls.push(sql);
   if(sql.includes('SELECT co.id'))return {rows:mode==='revoked'?[]:[{id:'connector',device_public_key:publicKey,project_id:'project'}]};
   if(sql.includes('count(*)'))return {rows:[{n:mode==='rate'?200:0}]};
   if(sql.includes('INSERT INTO connector_telemetry_receipts'))return {rowCount:mode==='replay'?0:1};
   if(sql.includes('INSERT INTO host_log_entries')){assert.equal(args?.[0],serverId);assert.ok(!String(args?.[5]).includes('secret-value'));return {rowCount:1};}
   if(sql.includes('INSERT INTO audit_events'))assert.equal(args?.[0],'project');
   return {rows:[],rowCount:1};
 }};
 const pool={connect:async()=>client} as any,serverId=randomUUID();
 const raw=Buffer.from(JSON.stringify({serverId,entries:[entry('token=secret-value')]}));
 const stamp=String(Date.now()),nonce=randomUUID();
 const headers=new Headers({'x-ryvix-timestamp':stamp,'x-ryvix-nonce':nonce,'x-ryvix-signature':sign(null,signingMessage(raw,stamp,nonce,'/api/connector/logs'),pair.privateKey).toString('base64')});
 assert.deepEqual(await ingestHostLogs(pool,raw,headers),{received:1});assert.ok(calls.includes('COMMIT'));
 for(mode of ['revoked','rate','replay']){calls.length=0;await assert.rejects(ingestHostLogs(pool,raw,headers));assert.ok(calls.includes('ROLLBACK'));assert.ok(!calls.some(s=>s.includes('INSERT INTO host_log_entries')));}
 mode='ok';calls.length=0;await assert.rejects(ingestHostLogs(pool,raw,new Headers()));assert.ok(!calls.some(s=>s.includes('INSERT INTO host_log_entries')));
});
test('detection is bounded evidence, not an invented malware diagnosis',()=>{
  const parsed=parseHostLogs(Buffer.from(JSON.stringify({serverId:crypto.randomUUID(),entries:[entry('Failed password for invalid user test'),entry('ordinary message'),entry('Out of memory: Killed process 123')]})),now);
  assert.equal(detectLogSignals(parsed.entries).length,1);
  assert.equal(detectLogSignals(parsed.entries)[0].type,'suspicious_activity');
  assert.equal(detectLogSignals(Array.from({length:5},()=>({...parsed.entries[0],id:crypto.randomUUID()}))).length,1);
});
