import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {CloudRecoveryStore} from '../../../../../backend/src/services/cloud-recovery-store';
import {DeviceError,deviceUuid} from '../../../../../backend/src/services/device-protocol';
async function handle(request:Request,mutate:boolean){try{
  const {organizationId,user}=await requireTenant();const store=new CloudRecoveryStore(getDirectDbPool());
  if(!mutate)return NextResponse.json({requests:await store.list(organizationId,user.id),userId:user.id},{headers:{'Cache-Control':'no-store'}});
  let body;try{body=JSON.parse((await boundedDeviceBody(request,8192)).toString());}catch{throw new RequestError('Invalid recovery request.',400);}
  const result=body?.action==='request'?await store.request(organizationId,user.id,body.serverId):
    ['approve','reject'].includes(body?.action)&&deviceUuid.test(body.id||'')?await store.decide(organizationId,user.id,body.id,body.action==='approve'):null;
  if(!result)throw new RequestError('Invalid recovery action.',400);return NextResponse.json(result);
}catch(e){const known=e instanceof RequestError||e instanceof DeviceError;return NextResponse.json({error:known?e.message:'Cloud recovery unavailable.'},{status:known?e.status:503});}}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
