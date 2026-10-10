import { NextResponse } from 'next/server';
import { requireTenant, RequestError } from '@/utils/tenant-context';
import { getDirectDbPool } from '@/utils/direct-db';
import { boundedDeviceBody } from '@/utils/device-ingestion';
import { DeviceError } from '../../../../backend/src/services/device-protocol';
import { LearningStore, LearningError } from '../../../../backend/src/services/learning-store';
import {NEURAL_THREAT_CLASSES} from '../../../../ai/src/neural-classifier';
export const dynamic='force-dynamic';
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
async function handle(request:Request,mutate:boolean) {
  try {
    const {organizationId,user}=await requireTenant();
    const store=new LearningStore(getDirectDbPool());
    const project=new URL(request.url).searchParams.get('projectId') || '';
    if(!mutate&&!project){
      const projects=await getDirectDbPool().query(`SELECT p.id,p.name FROM projects p JOIN organization_members m ON m.organization_id=p.organization_id
        WHERE p.organization_id=$1 AND m.user_id=$2 AND m.role IN ('owner','admin','developer') ORDER BY p.name LIMIT 100`,[organizationId,user.id]);
      return NextResponse.json({projects:projects.rows,labels:NEURAL_THREAT_CLASSES,userId:user.id},{headers:{'Cache-Control':'no-store'}});
    }
    if(!uuid.test(project))throw new RequestError('Valid projectId required.',400);
    if(!mutate)return NextResponse.json({examples:await store.list(organizationId,user.id,project),checkpoints:await store.checkpoints(organizationId,user.id,project)},{headers:{'Cache-Control':'no-store'}});
    let body;try{body=JSON.parse((await boundedDeviceBody(request,40000)).toString('utf8'));}catch(error){if(error instanceof DeviceError)throw error;throw new RequestError('Invalid JSON.',400);}
    let result;
    if(!body||typeof body!=='object')throw new RequestError('Invalid learning request.',400);
    if(body.action==='submit')result=await store.submit(organizationId,user.id,project,body);
    else if(['approve','reject'].includes(body.action)&&uuid.test(body.id))result=await store.review(organizationId,user.id,project,body.id,body.action==='approve',body.note);
    else if(body.action==='promote'&&uuid.test(body.id))result=await store.promote(organizationId,user.id,project,body.id);
    else if(body.action==='rollback')result=await store.promote(organizationId,user.id,project,'',true);
    else if(body.action==='predict'&&body.event&&typeof body.event==='object'&&!Array.isArray(body.event))result=await store.predict(organizationId,user.id,project,body.event);
    else throw new RequestError('Invalid learning action.',400);
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){const known=error instanceof RequestError||error instanceof LearningError||error instanceof DeviceError;
    return NextResponse.json({error:known?error.message:'Learning data unavailable.'},{status:known?error.status:503});}
}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
