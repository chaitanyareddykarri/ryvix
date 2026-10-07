import assert from 'node:assert/strict';
import { SettingsStore } from '../backend/src/services/settings-store';
import type { Pool } from 'pg';

export async function testSettingsMutations() {
  let role='viewer', auditFailure=false, keyFound=true;
  const calls: string[]=[];
  const client={release(){},async query(sql:string,args?:unknown[]) {
    calls.push(sql);
    if(sql.startsWith('SELECT role')) { assert.ok(sql.includes('FOR UPDATE')); return {rows:[{role}]}; }
    if(sql.startsWith('UPDATE api_keys')) {assert.ok(sql.includes('organization_id=$2'));assert.deepEqual(args,['11111111-1111-4111-8111-111111111111','org']);return {rows:keyFound?[{id:args![0]}]:[]};}
    if(sql.includes('INSERT INTO organization_audit_events')) {
      assert.ok(!JSON.stringify(args).includes('ryvix_live_'));
      if(auditFailure)throw new Error('Audit unavailable');
    }
    return {rows:[{id:'key'}]};
  }};
  const store=new SettingsStore({connect:async()=>client} as unknown as Pool);
  await assert.rejects(store.mutate('org','user',{action:'update_org',orgName:'Changed'}),/Forbidden/);
  assert.ok(!calls.some(sql=>sql.startsWith('UPDATE organizations')));
  assert.ok(calls.includes('ROLLBACK'));
  role='admin'; calls.length=0;
  const result=await store.mutate('org','user',{action:'generate_key'});
  assert.match(String(result.rawKey),/^ryvix_live_[a-f0-9]{48}$/);
  assert.equal(calls.at(-1),'COMMIT');
  auditFailure=true; calls.length=0;
  await assert.rejects(store.mutate('org','user',{action:'update_org',orgName:'Changed'}),/Audit/);
  assert.ok(calls.includes('ROLLBACK') && !calls.includes('COMMIT'));
  auditFailure=false;calls.length=0;
  await store.mutate('org','user',{action:'revoke_key',keyId:'11111111-1111-4111-8111-111111111111'});
  assert.ok(calls.includes('COMMIT'));assert.ok(calls.some(sql=>sql.includes('INSERT INTO organization_audit_events')));
  auditFailure=true;calls.length=0;
  await assert.rejects(store.mutate('org','user',{action:'revoke_key',keyId:'11111111-1111-4111-8111-111111111111'}),/Audit/);
  assert.ok(calls.includes('ROLLBACK')&&!calls.includes('COMMIT'));
  auditFailure=false;
  keyFound=false;calls.length=0;
  await assert.rejects(store.mutate('org','user',{action:'revoke_key',keyId:'11111111-1111-4111-8111-111111111111'}),/not found|already revoked/i);
  assert.ok(calls.includes('ROLLBACK')&&!calls.includes('COMMIT'));
  role='viewer';calls.length=0;
  await assert.rejects(store.mutate('org','user',{action:'revoke_key',keyId:'11111111-1111-4111-8111-111111111111'}),/Forbidden/);
  assert.ok(!calls.some(sql=>sql.startsWith('UPDATE api_keys')));
}
