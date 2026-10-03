import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {DeviceError} from '../../../../../backend/src/services/device-protocol';
import {ChannelError} from '../../../../../backend/src/services/channel-inbox';
import {WhatsAppAssistant} from '../../../../../backend/src/services/whatsapp-assistant';
export const dynamic='force-dynamic';
async function handle(request:Request,write:boolean){try{
  const {organizationId,user}=await requireTenant(),store=new WhatsAppAssistant(getDirectDbPool());
  if(!write)return NextResponse.json(await store.dashboard(organizationId,user.id),{headers:{'Cache-Control':'no-store'}});
  let body;try{body=JSON.parse((await boundedDeviceBody(request,2048)).toString('utf8'));}catch(e){if(e instanceof DeviceError)throw e;throw new RequestError('Invalid JSON.',400);}
  return NextResponse.json(await store.configure(organizationId,user.id,body?.connectorId,body?.enabled,body?.notifications));
}catch(e){const known=e instanceof RequestError||e instanceof DeviceError||e instanceof ChannelError;return NextResponse.json({error:known?e.message:'Assistant unavailable.'},{status:known?e.status:503});}}
export const GET=(r:Request)=>handle(r,false);
export const POST=(r:Request)=>handle(r,true);
