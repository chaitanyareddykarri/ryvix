import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {DeviceError} from '../../../../../backend/src/services/device-protocol';
import {DeploymentRuntimeStore} from '../../../../../backend/src/services/deployment-runtime';
import {ProbeTargetError} from '../../../../../services/src/monitoring/public-probe';
async function handle(request:Request,mutate:boolean){try{
 const {organizationId,user}=await requireTenant(),store=new DeploymentRuntimeStore(getDirectDbPool());
 if(!mutate)return NextResponse.json({targets:await store.list(organizationId,user.id)},{headers:{'Cache-Control':'no-store'}});
 let body;try{body=JSON.parse((await boundedDeviceBody(request,8192)).toString());}catch(error){if(error instanceof DeviceError)throw error;throw new RequestError('Invalid request.',400);}
 const result=body?.action==='configure'?await store.configure(organizationId,user.id,body):body?.action==='check'?await store.check(organizationId,user.id,body.id):null;
 if(!result)throw new RequestError('Invalid deployment action.',400);return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(error){const known=error instanceof RequestError||error instanceof DeviceError;return NextResponse.json({error:known||error instanceof ProbeTargetError?error.message:'Deployment observation unavailable.'},{status:known?error.status:error instanceof ProbeTargetError?400:503});}}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
