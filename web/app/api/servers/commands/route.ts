import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {DeviceError,deviceUuid} from '../../../../../backend/src/services/device-protocol';
import {ServerCommandStore} from '../../../../../backend/src/services/server-command-store';
async function handle(request:Request,mutate:boolean){try{
  const {organizationId,user}=await requireTenant();const store=new ServerCommandStore(getDirectDbPool());
  if(!mutate)return NextResponse.json({commands:await store.list(organizationId,user.id),userId:user.id,
    services:(process.env.RYVIX_COMMAND_SERVICES||'').split(',').map(s=>s.trim()).filter(Boolean),configured:!!process.env.RYVIX_COMMAND_PRIVATE_KEY},{headers:{'Cache-Control':'no-store'}});
  let body;try{body=JSON.parse((await boundedDeviceBody(request,8192)).toString());}catch(error){if(error instanceof DeviceError)throw error;throw new RequestError('Invalid command request.',400);}
  let result;
  if(body?.action==='request')result=await store.request(organizationId,user.id,body.serverId,body.service);
  else if(['approve','reject'].includes(body?.action)&&deviceUuid.test(body.id))result=await store.decide(organizationId,user.id,body.id,body.action==='approve');
  else throw new RequestError('Invalid command action.',400);
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(error){const known=error instanceof RequestError||error instanceof DeviceError;return NextResponse.json({error:known?error.message:'Server command unavailable.'},{status:known?error.status:503});}}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
