import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {DeviceError,deviceUuid} from '../../../../backend/src/services/device-protocol';
import {ReleaseStore} from '../../../../backend/src/services/release-store';
async function handle(request:Request,mutate:boolean){try{
  const {organizationId,user}=await requireTenant(),store=new ReleaseStore(getDirectDbPool());
  if(!mutate)return NextResponse.json({releases:await store.list(organizationId,user.id)},{headers:{'Cache-Control':'no-store'}});
  let body;try{body=JSON.parse((await boundedDeviceBody(request,4096)).toString());}catch{throw new RequestError('Invalid release request.',400);}
  if(!deviceUuid.test(body?.taskId||'')||!deviceUuid.test(body?.targetId||''))throw new RequestError('Select a release.',400);
  if(body.action==='approve')return NextResponse.json(await store.approve(organizationId,user.id,body.taskId,body.targetId,body.headSha,body.targetVersion));
  if(body.action==='reconcile')return NextResponse.json(await store.reconcile(organizationId,user.id,body.taskId,body.targetId));
  throw new RequestError('Select approve or reconcile.',400);
}catch(e){const known=e instanceof RequestError||e instanceof DeviceError;return NextResponse.json({error:known?e.message:'Release unavailable.'},{status:known?e.status:503});}}
export const GET=(r:Request)=>handle(r,false);
export const POST=(r:Request)=>handle(r,true);
