import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {ChannelAccounts,channelProviderJson} from '../../../../../backend/src/services/channel-accounts';
import {ChannelError} from '../../../../../backend/src/services/channel-inbox';
export async function POST(request:Request){try{
  const {organizationId,user,role}=await requireTenant();if(!['owner','admin'].includes(role))throw new RequestError('Channel administrator required.',403);
  let body;try{body=JSON.parse((await boundedDeviceBody(request,8192)).toString('utf8'));}catch{throw new RequestError('Invalid WhatsApp configuration.',400);}
  if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.environmentId||'')||!/^\d{5,30}$/.test(body.phoneId||'')||typeof body.token!=='string'||body.token.length<20||body.token.length>4096)throw new RequestError('Environment, phone ID and access token required.',400);
  const version=process.env.WHATSAPP_GRAPH_VERSION||'';if(!/^v\d+\.\d+$/.test(version)||!process.env.WHATSAPP_APP_SECRET||!process.env.WHATSAPP_VERIFY_TOKEN)throw new RequestError('WhatsApp application configuration missing.',503);
  const phone=await channelProviderJson(`https://graph.facebook.com/${version}/${body.phoneId}?fields=id`,{headers:{Authorization:`Bearer ${body.token}`}});
  if(phone.id!==body.phoneId)throw new RequestError('WhatsApp phone verification failed.',403);
  return NextResponse.json(await new ChannelAccounts(getDirectDbPool()).connect(organizationId,user.id,body.environmentId,'whatsapp',body.phoneId,body.token));
}catch(error){const known=error instanceof RequestError||error instanceof ChannelError;return NextResponse.json({error:known?error.message:'WhatsApp connection unavailable.'},{status:known?error.status:503});}}
