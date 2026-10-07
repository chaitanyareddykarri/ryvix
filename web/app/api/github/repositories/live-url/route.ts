import {NextResponse} from 'next/server';
import type {PoolClient} from 'pg';
import {requireTenant,requireOperator,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {DeviceError,digest} from '../../../../../../backend/src/services/device-protocol';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
async function handle(request:Request,write:boolean){
 let client:PoolClient|undefined;
 try{
  const {organizationId,user,role}=await requireTenant();
  if(write)requireOperator(role);
  let body:any={};
  if(write){try{body=JSON.parse((await boundedDeviceBody(request,4096)).toString('utf8'));}catch(e){if(e instanceof DeviceError)throw e;throw new RequestError('Invalid JSON.',400);}}
  const id=write?body?.repositoryId:new URL(request.url).searchParams.get('repositoryId');
  if(typeof id!=='string'||! /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))throw new RequestError('Select a connected repository.',400);
  let liveUrl:string|null=null;
  if(write&&body.liveUrl!==null){
   if(typeof body.liveUrl!=='string'||body.liveUrl.length>2048)throw new RequestError('Enter an HTTP or HTTPS URL.',400);
   let url:URL;try{url=new URL(body.liveUrl);}catch{throw new RequestError('Enter an HTTP or HTTPS URL.',400);}
   if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.href.length>2048)throw new RequestError('Use HTTP(S) without embedded credentials.',400);
   liveUrl=url.href;
  }
  client=await getDirectDbPool().connect();await client.query('BEGIN');
  const members=await client.query('SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2 FOR SHARE',[organizationId,user.id]);
  if(!members.rows.length)throw new RequestError('Organization access denied.',403);
  if(write)requireOperator(members.rows[0].role);
  const scoped=await client.query(`SELECT r.live_url FROM repositories r JOIN projects p ON p.id=r.project_id
    WHERE r.id=$1 AND p.organization_id=$2 FOR UPDATE OF r`,[id,organizationId]);
  if(!scoped.rows.length)throw new RequestError('Repository unavailable.',404);
  if(write){
   await client.query('UPDATE repositories SET live_url=$2,updated_at=now() WHERE id=$1',[id,liveUrl]);
   await client.query(`INSERT INTO organization_audit_events(organization_id,actor_id,action_name,parameters_hash)
     VALUES($1,$2,'repository.live_url.update',$3)`,[organizationId,user.id,digest(JSON.stringify({id,liveUrl}))]);
  }else liveUrl=scoped.rows[0].live_url;
  await client.query('COMMIT');return NextResponse.json({liveUrl},{headers});
 }catch(error){
  if(client)await client.query('ROLLBACK').catch(()=>{});
  const known=error instanceof RequestError||error instanceof DeviceError;
  return NextResponse.json({error:known?error.message:'Website URL unavailable. Check database migrations and retry.'},{status:known?error.status:503,headers});
 }finally{client?.release();}
}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
