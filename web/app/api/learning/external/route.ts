import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {DeviceError} from '../../../../../backend/src/services/device-protocol';
import {ExperienceError} from '../../../../../backend/src/services/experience-store';
import {ExternalTraining} from '../../../../../backend/src/services/external-training';
const failure=(e:unknown)=>NextResponse.json({error:e instanceof RequestError||e instanceof ExperienceError||e instanceof DeviceError?e.message:'Training preparation unavailable.'},{status:e instanceof RequestError||e instanceof ExperienceError||e instanceof DeviceError?e.status:503});
export async function GET(request:Request){try{const t=await requireTenant();return NextResponse.json(await new ExternalTraining(getDirectDbPool()).list(t.organizationId,t.user.id,new URL(request.url).searchParams.get('projectId')||''),{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
export async function POST(request:Request){try{const t=await requireTenant();const b=JSON.parse((await boundedDeviceBody(request,16000)).toString()),s=new ExternalTraining(getDirectDbPool());
  const args=[t.organizationId,t.user.id,b.projectId] as const;let result;
  if(b.action==='submit')result=await s.submit(...args,b);
  else if(b.action==='review')result=await s.review(...args,b.id,b.approve,b.note);
  else if(b.action==='revoke')result=await s.revoke(...args,b.id);
  else if(b.action==='export')result=await s.export(...args,b.provider,b.model);
  else throw new ExperienceError('Unknown training action.');
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
