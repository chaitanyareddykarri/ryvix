import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {DeviceError} from '../../../../backend/src/services/device-protocol';
import {ExperienceStore,ExperienceError} from '../../../../backend/src/services/experience-store';
export const dynamic='force-dynamic';
async function handle(request:Request,write:boolean){try{
  const {organizationId,user}=await requireTenant(),store=new ExperienceStore(getDirectDbPool());
  const project=new URL(request.url).searchParams.get('projectId')||'';
  if(!write)return NextResponse.json(project?await store.list(organizationId,user.id,project):{memories:await store.memories(organizationId,user.id),responseStats:await store.responseStats(organizationId,user.id)},{headers:{'Cache-Control':'no-store'}});
  let b;try{b=JSON.parse((await boundedDeviceBody(request,12000)).toString('utf8'));}catch(e){if(e instanceof DeviceError)throw e;throw new RequestError('Invalid JSON.',400);}
  if(!b||typeof b!=='object')throw new RequestError('Invalid request.',400);
  let result;
  switch(b.action){
    case 'remember':result=await store.remember(organizationId,user.id,b);break;
    case 'forget':result=await store.forget(organizationId,user.id,b.id);break;
    case 'configure':result=await store.configure(organizationId,user.id,project,b.enabled,b.days);break;
    case 'feedback':result=await store.feedback(organizationId,user.id,project,b);break;
    case 'propose':result=await store.propose(organizationId,user.id,project,b.eventId,b.content);break;
    case 'review':result=await store.review(organizationId,user.id,project,b.id,b.approve,b.note);break;
    case 'revoke':result=await store.revoke(organizationId,user.id,project,b.id);break;
    default:throw new RequestError('Unknown experience action.',400);
  }
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(e){const known=e instanceof ExperienceError||e instanceof RequestError||e instanceof DeviceError;
  return NextResponse.json({error:known?e.message:'Experience unavailable. Check migration and database access.'},{status:known?e.status:503});}}
export const GET=(r:Request)=>handle(r,false);
export const POST=(r:Request)=>handle(r,true);
