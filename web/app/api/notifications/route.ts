import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {DeviceError} from '../../../../backend/src/services/device-protocol';
import {EmailNotifications} from '../../../../backend/src/services/email-notifications';
async function handle(request:Request,mutate:boolean){try{
  const {organizationId,user}=await requireTenant(),store=new EmailNotifications(getDirectDbPool());
  if(!mutate)return NextResponse.json({preferences:await store.preferences(organizationId,user.id),history:await store.history(organizationId,user.id)},{headers:{'Cache-Control':'no-store'}});
  let body;try{body=JSON.parse((await boundedDeviceBody(request,4096)).toString());}catch{throw new RequestError('Invalid notification preferences.',400);}
  return NextResponse.json(await store.configure(organizationId,user.id,body.environmentId,body.securityEnabled,body.deploymentEnabled));
}catch(e){const known=e instanceof RequestError||e instanceof DeviceError;return NextResponse.json({error:known?e.message:'Notifications unavailable.'},{status:known?e.status:503});}}
export const GET=(r:Request)=>handle(r,false);
export const POST=(r:Request)=>handle(r,true);
