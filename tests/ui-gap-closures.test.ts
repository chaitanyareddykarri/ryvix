import assert from 'node:assert/strict';
import {createHash,createPublicKey,sign,verify} from 'node:crypto';
import {mkdtempSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import type {Pool} from 'pg';
import {ServerAccessManager} from '../ai/src/server-access-manager';
import {TeamStore} from '../backend/src/services/team-store';
import {readApiServers} from '../backend/src/services/api-access';

export async function testSshWireFormat(){
 const keys=ServerAccessManager.generateSshKeypair('fixture-key');
 const wire=Buffer.from(keys.publicKey.split(' ')[1],'base64');
 const reader=(buffer:Buffer,start=0)=>{let offset=start;return {field(){const n=buffer.readUInt32BE(offset);offset+=4;const value=buffer.subarray(offset,offset+n);offset+=n;return value;},uint(){const n=buffer.readUInt32BE(offset);offset+=4;return n;},remaining(){return buffer.subarray(offset);}};};
 const pub=reader(wire);assert.equal(pub.field().toString(),'ssh-ed25519');const raw=pub.field();assert.equal(raw.length,32);assert.equal(pub.remaining().length,0);
 const jwk=createPublicKey(keys.privateKey).export({format:'jwk'});assert.equal(raw.toString('base64url'),jwk.x);
 const privateWire=Buffer.from(keys.opensshPrivateKey.replace(/-----[^\n]+-----|\s/g,''),'base64');
 assert.equal(privateWire.subarray(0,15).toString(),'openssh-key-v1\0');const envelope=reader(privateWire,15);
 assert.equal(envelope.field().toString(),'none');assert.equal(envelope.field().toString(),'none');assert.equal(envelope.field().length,0);assert.equal(envelope.uint(),1);assert.deepEqual(envelope.field(),wire);
 const privateBlock=envelope.field();assert.equal(privateBlock.length%8,0);const secret=reader(privateBlock);assert.equal(secret.uint(),secret.uint());assert.equal(secret.field().toString(),'ssh-ed25519');assert.deepEqual(secret.field(),raw);const pair=secret.field();assert.equal(pair.length,64);assert.deepEqual(pair.subarray(32),raw);assert.equal(secret.field().toString(),'fixture-key');
 const padding=secret.remaining();assert.deepEqual([...padding],Array.from({length:padding.length},(_,i)=>i+1));
 const message=Buffer.from('fixture');assert.ok(verify(null,message,createPublicKey({key:{kty:'OKP',crv:'Ed25519',x:raw.toString('base64url')},format:'jwk'}),sign(null,message,keys.privateKey)));
 assert.throws(()=>ServerAccessManager.generateSshKeypair('bad\nlabel'));
 const directory=mkdtempSync(join(tmpdir(),'ryvix-ssh-format-')),path=join(directory,'fixture-key');
 try{
  writeFileSync(path,keys.opensshPrivateKey,{mode:0o600});
  if(process.platform==='win32'){
   const identity=spawnSync('whoami',[],{encoding:'utf8',windowsHide:true}).stdout.trim();assert.ok(identity);
   const permissions=spawnSync('icacls',[path,'/inheritance:r','/grant:r',`${identity}:(F)`],{encoding:'utf8',windowsHide:true});assert.equal(permissions.status,0,permissions.stderr);
  }
  const parsed=spawnSync('ssh-keygen',['-y','-P','','-f',path],{encoding:'utf8',timeout:10000,windowsHide:true});
  if((parsed.error as NodeJS.ErrnoException|undefined)?.code==='ENOENT')console.log('SKIP OpenSSH executable check: ssh-keygen not installed; wire-format checks passed.');
  else{assert.equal(parsed.status,0,parsed.stderr);assert.equal(parsed.stdout.trim().split(' ').slice(0,2).join(' '),keys.publicKey.split(' ').slice(0,2).join(' '));}
 }finally{unlinkSync(path);rmdirSync(directory);}
 assert.ok(!ServerAccessManager.diagnoseAccessError('SSH_CREDENTIAL','sudo: a password is required').recommendedUserAction.includes('NOPASSWD:ALL'));
}

export async function testApiKeyAccess(){
 const token='ryvix_live_'+'a'.repeat(48),calls:string[]=[];let present=true,scopes=['read'],budget=true,auditFails=false;
 const client={release(){},async query(sql:string,args:any[]=[]){calls.push(sql);
  assert.ok(!JSON.stringify(args).includes(token));
  if(sql.includes('SELECT id,organization_id,scopes')){assert.ok(sql.includes('revoked_at IS NULL')&&sql.includes('expires_at>now()'));assert.equal(args[0],createHash('sha256').update(token).digest('hex'));return {rows:present?[{id:'key',organization_id:'org',scopes}]:[]};}
  if(sql.includes('INSERT INTO chat_request_budgets'))return {rows:budget?[{requests:1}]:[]};
  if(sql.includes('FROM servers')){assert.deepEqual(args,['org']);assert.ok(sql.includes('p.organization_id=$1'));return {rows:[{id:'server',hostname:'fixture'}]};}
  if(sql.includes('INSERT INTO organization_audit_events')&&auditFails)throw new Error('Audit failed');return {rows:[]};
 }};const pool={connect:async()=>client} as unknown as Pool;
 await assert.rejects(readApiServers(pool,null),/bearer/);assert.equal(calls.length,0);
 assert.equal((await readApiServers(pool,`Bearer ${token}`)).servers[0].id,'server');assert.equal(calls.at(-1),'COMMIT');
 for(const scenario of ['missing','scope','rate','audit']){present=scenario!=='missing';scopes=scenario==='scope'?['write']:['read'];budget=scenario!=='rate';auditFails=scenario==='audit';calls.length=0;await assert.rejects(readApiServers(pool,`Bearer ${token}`));assert.equal(calls.at(-1),'ROLLBACK');assert.ok(!calls.includes('COMMIT'));if(scenario!=='audit')assert.ok(!calls.some(sql=>sql.includes('FROM servers')));}
}

export async function testTeamManagement(){
 const id='11111111-1111-4111-8111-111111111111';let role='owner',targetRole='developer',targetUser='other',owners=2,owned=false,auditFails=false,available=true;
 const calls:Array<{sql:string;args:any[]}>=[];
 const client={release(){},async query(sql:string,args:any[]=[]){calls.push({sql,args});
  if(sql.startsWith('SELECT role FROM organization_members'))return {rows:[{role}]};
  if(sql.startsWith('SELECT user_id,role'))return {rows:[{user_id:targetUser,role:targetRole}]};
  if(sql.startsWith('SELECT user_id FROM organization_members'))return {rows:Array.from({length:owners},()=>({user_id:'owner'}))};
  if(sql.includes('FROM channel_accounts'))return {rows:owned?[{exists:true}]:[]};
  if(sql.includes('INSERT INTO chat_request_budgets'))return {rows:[{requests:1}]};
  if(sql.startsWith('INSERT INTO organization_invitations')){assert.match(args[4],/^[a-f0-9]{64}$/);return {rows:[{id,email:args[2],role:args[3]}]};}
  if(sql.startsWith('SELECT organization_id FROM organization_invitations'))return {rows:[{organization_id:'org'}]};
  if(sql.includes('SELECT i.*')){assert.ok(sql.includes('i.expires_at>now()')&&sql.includes('i.accepted_at IS NULL')&&sql.includes('i.revoked_at IS NULL'));assert.deepEqual(args.slice(1),['org','person@example.test']);return {rows:available?[{id,organization_id:'org',role:'viewer'}]:[]};}
  if(sql.startsWith('UPDATE profiles p SET'))return {rows:[{id:'user'}]};
  if(sql.includes('INSERT INTO organization_audit_events')&&auditFails)throw new Error('Audit failed');return {rows:[]};
 }};
 const store=new TeamStore({connect:async()=>client} as unknown as Pool);
 const mutate=(action='role',newRole='viewer')=>store.mutate('org','actor',{action,id,expectedRole:targetRole,role:newRole});
 await mutate();assert.equal(calls.at(-1)?.sql,'COMMIT');assert.ok(calls.some(c=>c.sql.startsWith('UPDATE organization_members')&&c.args[1]==='org'));
 for(const scenario of ['viewer','admin_privilege','self','last_owner','owned','audit']){
  role=scenario==='viewer'?'viewer':scenario==='admin_privilege'?'admin':'owner';targetRole=['admin_privilege','last_owner'].includes(scenario)?'owner':'developer';targetUser=scenario==='self'?'actor':'other';owners=scenario==='last_owner'?1:2;owned=scenario==='owned';auditFails=scenario==='audit';calls.length=0;
  await assert.rejects(mutate());assert.equal(calls.at(-1)?.sql,'ROLLBACK');assert.ok(!calls.some(c=>c.sql==='COMMIT'));
 }
 role='owner';targetRole='developer';targetUser='other';owned=false;auditFails=false;
 await assert.rejects(store.mutate('org','actor',{action:'role',id,expectedRole:'viewer',role:'admin'}),/changed/);
 const invitation=await store.invite('org','actor','PERSON@example.test','viewer');assert.match(invitation.token,/^[a-f0-9]{64}$/);assert.ok(!calls.some(c=>JSON.stringify(c.args).includes(invitation.token)));
 role='admin';await assert.rejects(store.invite('org','actor','person@example.test','admin'),/Only owners/);
 await assert.rejects(store.accept('user','person@example.test',false,invitation.token),/Verify/);
 await store.accept('user','person@example.test',true,invitation.token);assert.ok(calls.some(c=>c.sql.includes('ON CONFLICT(organization_id,user_id) DO NOTHING')));
 available=false;await assert.rejects(store.accept('user','person@example.test',true,invitation.token),/expired|used/);
}
