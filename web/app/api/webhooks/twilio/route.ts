import {NextResponse} from 'next/server';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {getDirectDbPool} from '@/utils/direct-db';
import {DeviceError} from '../../../../../backend/src/services/device-protocol';
import {ChannelError} from '../../../../../backend/src/services/channel-inbox';
import {IncidentNotifications} from '../../../../../backend/src/services/incident-notifications';
export async function POST(request:Request){try{
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/x-www-form-urlencoded'))throw new ChannelError('Form callback required.',415);
 const url=new URL(request.url);if([...url.searchParams.keys()].length!==1||!url.searchParams.has('notification'))throw new ChannelError('Invalid callback URL.',400);
 await new IncidentNotifications(getDirectDbPool()).twilioReceipt(url.searchParams.get('notification')||'',(await boundedDeviceBody(request,8192)).toString(),request.headers.get('x-twilio-signature')||'');
 return new Response(null,{status:204});
 }catch(e){const known=e instanceof ChannelError||e instanceof DeviceError;return NextResponse.json({error:known?e.message:'SMS status unavailable.'},{status:known?e.status:503});}}
