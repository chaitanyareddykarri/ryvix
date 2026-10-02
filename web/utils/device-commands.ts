import 'server-only';
import {NextResponse} from 'next/server';
import {boundedDeviceBody} from './device-ingestion';
import {getDirectDbPool} from './direct-db';
import {DeviceError} from '../../backend/src/services/device-protocol';
import {ServerCommandStore} from '../../backend/src/services/server-command-store';
export async function deviceCommandRequest(request:Request,path:'/api/connector/commands/poll'|'/api/connector/commands/result'){
  try{return NextResponse.json(await new ServerCommandStore(getDirectDbPool()).device(await boundedDeviceBody(request,8192),request.headers,path),{headers:{'Cache-Control':'no-store'}});}
  catch(error){return NextResponse.json({error:error instanceof DeviceError?error.message:'Device command unavailable.'},{status:error instanceof DeviceError?error.status:503});}
}
