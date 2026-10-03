import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {getDirectDbPool} from '@/utils/direct-db';
import {WhatsAppPhone} from '../../../../../backend/src/services/whatsapp-phone';
import {ChannelError} from '../../../../../backend/src/services/channel-inbox';
import {DeviceError} from '../../../../../backend/src/services/device-protocol';
export const dynamic='force-dynamic';
async function handle(request:Request,write:boolean){try{
  const {organizationId,user}=await requireTenant(),store=new WhatsAppPhone(getDirectDbPool());
  if(!write)return NextResponse.json({connections:await store.list(organizationId,user.id)},{headers:{'Cache-Control':'no-store'}});
  let body;try{body=JSON.parse((await boundedDeviceBody(request,2048)).toString('utf8'));}catch(e){if(e instanceof DeviceError)throw e;throw new RequestError('Invalid JSON.',400);}
  if(!body||typeof body.connectorId!=='string')throw new RequestError('Select a WhatsApp connection.',400);
  let result;
  if(body.action==='send')result=await store.request(organizationId,user.id,body.connectorId,body.phone);
  else if(body.action==='verify'&&typeof body.challengeId==='string'&&typeof body.code==='string')result=await store.verify(organizationId,user.id,body.connectorId,body.challengeId,body.code);
  else if(body.action==='remove')result=await store.unlink(organizationId,user.id,body.connectorId);
  else throw new RequestError('Invalid phone action.',400);
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(e){const known=e instanceof RequestError||e instanceof ChannelError||e instanceof DeviceError;
  return NextResponse.json({error:known?e.message:'Phone verification unavailable.'},{status:known?e.status:503});}}
export const GET=(r:Request)=>handle(r,false);
export const POST=(r:Request)=>handle(r,true);
