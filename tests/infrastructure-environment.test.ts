import assert from 'node:assert/strict';
import {createInfrastructureEnvironment} from '../backend/src/services/infrastructure-environment';

export async function testInfrastructureEnvironment(){
 let role='viewer',count=0,auditFailure=false,existing=false,production=false;
 const calls:string[]=[];
 const client={release(){},async query(sql:string,args:any[]=[]):Promise<any>{calls.push(sql);
  if(sql.startsWith('SELECT id FROM organizations')){assert.equal(args[0],'org');return {rows:[{id:'org'}]};}
  if(sql.includes('SELECT role FROM organization_members')){assert.deepEqual(args,['org','user']);return {rows:role==='missing'?[]:[{role}]};}
  if(sql.includes('SELECT count(*)'))return {rows:[{count}]};
  if(sql.includes('INSERT INTO projects')){assert.equal(args[0],'org');return {rows:existing?[]:[{id:'project',name:'Infrastructure'}]};}
  if(sql.includes('SELECT id,name FROM projects')){assert.equal(args[0],'org');return {rows:[{id:'project',name:'Infrastructure'}]};}
  if(sql.includes('INSERT INTO environments')){assert.equal(args[0],'project');return {rows:existing?[]:[{id:'environment',name:'Development',is_production:args[3]}]};}
  if(sql.includes('SELECT id,name,is_production FROM environments'))return {rows:[{id:'environment',name:'Development',is_production:production}]};
  if(sql.includes('INSERT INTO organization_audit_events')){assert.equal(args[0],'org');assert.equal(args[1],'user');if(auditFailure)throw new Error('audit unavailable');}
  return {rows:[]};
 }};
 const pool={connect:async()=>client} as any;
 const body={projectName:'Infrastructure',environmentName:'Development',isProduction:false};
 await assert.rejects(()=>createInfrastructureEnvironment(pool,'org','user',body),/permission/i);
 assert.ok(!calls.some(x=>x.includes('INSERT INTO projects')));
 role='developer';calls.length=0;const result=await createInfrastructureEnvironment(pool,'org','user',body);
 assert.equal(result.id,'environment');assert.equal(result.project_name,'Infrastructure');assert.equal(calls.at(-1),'COMMIT');assert.ok(calls.some(x=>x.includes('INSERT INTO organization_audit_events')));
 existing=true;calls.length=0;assert.equal((await createInfrastructureEnvironment(pool,'org','user',body)).id,'environment');assert.ok(!calls.some(x=>x.includes('INSERT INTO organization_audit_events')));
 production=true;await assert.rejects(()=>createInfrastructureEnvironment(pool,'org','user',body),/classification/);production=false;existing=false;
 count=20;await assert.rejects(()=>createInfrastructureEnvironment(pool,'org','user',body),/Too many/);count=0;
 auditFailure=true;await assert.rejects(()=>createInfrastructureEnvironment(pool,'org','user',body),/audit/);assert.equal(calls.at(-1),'ROLLBACK');auditFailure=false;
 for(const invalid of ['', 'x'.repeat(101), 'bad\nname'])await assert.rejects(()=>createInfrastructureEnvironment(pool,'org','user',{...body,projectName:invalid}),/name/);
 await assert.rejects(()=>createInfrastructureEnvironment(pool,'org','user',{...body,isProduction:'yes'}),/classification/);
 role='missing';await assert.rejects(()=>createInfrastructureEnvironment(pool,'org','user',body),/permission/i);
}
