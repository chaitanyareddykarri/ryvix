import {NextResponse} from 'next/server';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {getDirectDbPool} from '@/utils/direct-db';
import {DeviceError} from '../../../../../backend/src/services/device-protocol';
import {ingestSecuritySignals} from '../../../../../backend/src/services/security-ingestion';
export async function POST(request:Request){try{
  return NextResponse.json({success:true,...await ingestSecuritySignals(getDirectDbPool(),await boundedDeviceBody(request,32768),request.headers)});
}catch(e){return NextResponse.json({error:e instanceof DeviceError?e.message:'Security ingestion unavailable'},{status:e instanceof DeviceError?e.status:503});}}
