import {NextResponse} from 'next/server';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {getDirectDbPool} from '@/utils/direct-db';
import {DeviceError} from '../../../../../backend/src/services/device-protocol';
import {ingestHostLogs} from '../../../../../backend/src/services/host-logs';
export async function POST(request:Request){try{
  return NextResponse.json({success:true,...await ingestHostLogs(getDirectDbPool(),await boundedDeviceBody(request,131072),request.headers)});
}catch(error){return NextResponse.json({error:error instanceof DeviceError?error.message:'Log ingestion unavailable.'},{status:error instanceof DeviceError?error.status:503});}}
