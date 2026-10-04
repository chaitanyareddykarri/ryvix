import {NextResponse} from 'next/server';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {DeviceError} from '../../../../../backend/src/services/device-protocol';
import {ChannelError} from '../../../../../backend/src/services/channel-inbox';
import {acceptGmailPush} from '../../../../../backend/src/services/gmail-push';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
  const body=JSON.parse((await boundedDeviceBody(request,8192)).toString('utf8'));
  await acceptGmailPush(getDirectDbPool(),request.headers.get('authorization'),body);
  return new Response(null,{status:204});
}catch(e){const known=e instanceof ChannelError||e instanceof DeviceError;
  return NextResponse.json({error:known?e.message:'Push unavailable.'},{status:known?e.status:503});}}
