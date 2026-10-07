import {NextResponse} from 'next/server';
import {requireTenant,requireOperator,RequestError} from '@/utils/tenant-context';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {getDirectDbPool} from '@/utils/direct-db';
import {DeviceError} from '../../../../backend/src/services/device-protocol';
import {createInfrastructureEnvironment} from '../../../../backend/src/services/infrastructure-environment';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  const {organizationId,user,role}=await requireTenant();requireOperator(role);
  let body;try{body=JSON.parse((await boundedDeviceBody(request,2048)).toString('utf8'));}catch(error){if(error instanceof DeviceError)throw error;throw new RequestError('Invalid JSON.',400);}
  const environment=await createInfrastructureEnvironment(getDirectDbPool(),organizationId,user.id,body);
  return NextResponse.json({environment},{headers:{'Cache-Control':'no-store'}});
 }catch(error){const known=error instanceof RequestError||error instanceof DeviceError;
  return NextResponse.json({error:known?error.message:'Environment setup unavailable. Please retry.'},{status:known?error.status:503,headers:{'Cache-Control':'no-store'}});
 }
}
