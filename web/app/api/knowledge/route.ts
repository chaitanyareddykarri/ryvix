import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {DeviceError} from '../../../../backend/src/services/device-protocol';
import {ExperienceError} from '../../../../backend/src/services/experience-store';
import {RepositoryKnowledge} from '../../../../backend/src/services/repository-knowledge';
export const dynamic='force-dynamic';
async function handle(request:Request,write:boolean){try{
  const {organizationId,user}=await requireTenant(),store=new RepositoryKnowledge(getDirectDbPool());
  if(!write)return NextResponse.json({repositories:await store.list(organizationId,user.id)},{headers:{'Cache-Control':'no-store'}});
  let body;try{body=JSON.parse((await boundedDeviceBody(request,4000)).toString('utf8'));}catch(e){if(e instanceof DeviceError)throw e;throw new RequestError('Invalid JSON.',400);}
  if(!body||typeof body!=='object')throw new RequestError('Invalid request.',400);
  return NextResponse.json(await store.configure(organizationId,user.id,body.repositoryId,body.enabled));
}catch(e){const known=e instanceof ExperienceError||e instanceof RequestError||e instanceof DeviceError;
  return NextResponse.json({error:known?e.message:'Repository knowledge unavailable.'},{status:known?e.status:503});}}
export const GET=(r:Request)=>handle(r,false);
export const POST=(r:Request)=>handle(r,true);
