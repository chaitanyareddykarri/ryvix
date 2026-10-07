import type {Pool} from 'pg';
import {DeviceError,digest} from './device-protocol';

/** Repository-independent setup; never provisions a host or dispatches a command. */
export async function createInfrastructureEnvironment(pool:Pool,organizationId:string,userId:string,input:any){
 const name=(value:unknown)=>{
  if(typeof value!=='string'||!value.trim()||value.trim().length>100||/[\x00-\x1f\x7f]/.test(value))throw new DeviceError('Use a name of 1–100 characters without control characters.',400);
  return value.trim();
 };
 const projectName=name(input?.projectName),environmentName=name(input?.environmentName);
 if(typeof input?.isProduction!=='boolean')throw new DeviceError('Choose the environment production classification.',400);
 const production=input.isProduction;
 // Dedicated namespace avoids colliding with repository-owned project slugs.
 const projectSlug=`infra-${digest(projectName.toLowerCase())}`;
 const environmentSlug=`env-${digest(environmentName.toLowerCase())}`;
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout='5s'");await client.query("SET LOCAL statement_timeout='15s'");
  const org=await client.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[organizationId]);
  if(!org.rows.length)throw new DeviceError('Workspace unavailable.',403);
  const member=(await client.query('SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2 FOR SHARE',[organizationId,userId])).rows[0];
  if(!member||!['owner','admin','developer'].includes(member.role))throw new DeviceError('Operator permission required.',403);
  const count=await client.query(`SELECT count(*)::int AS count FROM organization_audit_events
    WHERE organization_id=$1 AND actor_id=$2 AND action_name='infrastructure.environment.create'
    AND created_at>now()-interval '1 hour'`,[organizationId,userId]);
  if(count.rows[0].count>=20)throw new DeviceError('Too many environment creations. Retry later.',429);
  const inserted=await client.query(`INSERT INTO projects(organization_id,name,slug,environment)
    VALUES($1,$2,$3,$4) ON CONFLICT(organization_id,slug) DO NOTHING RETURNING id,name`,[organizationId,projectName,projectSlug,production?'production':'development']);
  const project=inserted.rows[0]||(await client.query('SELECT id,name FROM projects WHERE organization_id=$1 AND slug=$2',[organizationId,projectSlug])).rows[0];
  if(!project)throw new DeviceError('Project unavailable.',409);
  const created=await client.query(`INSERT INTO environments(project_id,name,slug,is_production)
    VALUES($1,$2,$3,$4) ON CONFLICT(project_id,slug) DO NOTHING RETURNING id,name,is_production`,[project.id,environmentName,environmentSlug,production]);
  const environment=created.rows[0]||(await client.query('SELECT id,name,is_production FROM environments WHERE project_id=$1 AND slug=$2',[project.id,environmentSlug])).rows[0];
  if(!environment||environment.is_production!==production)throw new DeviceError('An environment with this name has a different production classification. Use another name or select its existing classification.',409);
  if(created.rows.length)await client.query(`INSERT INTO organization_audit_events(organization_id,actor_id,action_name,parameters_hash)
    VALUES($1,$2,'infrastructure.environment.create',$3)`,[organizationId,userId,digest(JSON.stringify({projectId:project.id,environmentId:environment.id,isProduction:production}))]);
  await client.query('COMMIT');
  return {...environment,project_name:project.name};
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}
