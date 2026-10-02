import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {ChannelAccounts,channelProviderJson} from '../../../../../backend/src/services/channel-accounts';
import {ChannelError} from '../../../../../backend/src/services/channel-inbox';
import {pollGmail} from '../../../../../backend/src/connectors/gmail-inbox';
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
function failure(error:unknown){const known=error instanceof RequestError||error instanceof ChannelError;return NextResponse.json({error:known?error.message:'Gmail connection unavailable.'},{status:known?error.status:503});}
export async function GET(request:Request){try{
  const {organizationId,user,role}=await requireTenant();if(!['owner','admin'].includes(role))throw new RequestError('Channel administrator required.',403);
  const origin=new URL(process.env.RYVIX_PUBLIC_URL||'');if(origin.protocol!=='https:'||origin.username||origin.password)throw new Error('HTTPS origin required');
  const redirect=`${origin.origin}/api/channels/gmail`;
  const clientId=process.env.GMAIL_CLIENT_ID;if(!clientId||!process.env.GMAIL_CLIENT_SECRET)throw new RequestError('Google OAuth application is not configured.',503);
  const params=new URL(request.url).searchParams;const jar=await cookies();
  if(params.has('code')||params.has('error')){
    const saved=jar.get('ryvix_gmail_oauth')?.value;jar.delete('ryvix_gmail_oauth');
    if(!saved)throw new RequestError('OAuth session expired.',400);
    const state=JSON.parse(saved),supplied=params.get('state')||'';
    if(state.user!==user.id||state.org!==organizationId||Date.now()>state.expires||typeof state.state!=='string'||Buffer.byteLength(supplied)!==Buffer.byteLength(state.state)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(state.state))||!params.get('code'))throw new RequestError('OAuth verification failed.',400);
    const token=await channelProviderJson('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:process.env.GMAIL_CLIENT_SECRET,code:params.get('code')!,code_verifier:state.verifier,redirect_uri:redirect,grant_type:'authorization_code'})});
    if(typeof token.refresh_token!=='string'||typeof token.access_token!=='string')throw new RequestError('Offline Gmail consent required. Reconnect with consent.',409);
    const profile=await channelProviderJson('https://gmail.googleapis.com/gmail/v1/users/me/profile',{headers:{Authorization:`Bearer ${token.access_token}`}});
    if(typeof profile.emailAddress!=='string'||!/^\d+$/.test(profile.historyId))throw new Error('Invalid Gmail profile');
    await new ChannelAccounts(getDirectDbPool()).connect(organizationId,user.id,state.environment,'gmail',profile.emailAddress.toLowerCase(),JSON.stringify({refresh_token:token.refresh_token}),profile.historyId);
    return NextResponse.redirect(new URL('/channels',origin));
  }
  const environment=params.get('environmentId')||'';if(!uuid.test(environment))throw new RequestError('Select an environment.',400);
  const state=randomBytes(24).toString('hex'),verifier=randomBytes(48).toString('base64url');
  jar.set('ryvix_gmail_oauth',JSON.stringify({state,verifier,user:user.id,org:organizationId,environment,expires:Date.now()+600000}),{httpOnly:true,secure:true,sameSite:'lax',path:'/api/channels/gmail',maxAge:600});
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search=new URLSearchParams({client_id:clientId,redirect_uri:redirect,response_type:'code',scope:'https://www.googleapis.com/auth/gmail.readonly',access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
  return NextResponse.redirect(url);
}catch(error){return failure(error);}}
export async function POST(request:Request){try{
  const {organizationId,user}=await requireTenant();const body=await request.json().catch(()=>null);
  if(!uuid.test(body?.connectorId||''))throw new RequestError('Select a Gmail connection.',400);
  return NextResponse.json(await pollGmail(getDirectDbPool(),organizationId,user.id,body.connectorId));
}catch(error){return failure(error);}}
