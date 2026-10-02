import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {verifyWhatsAppSignature,whatsappMessages} from '../../../../../services/src/communication/whatsapp';
import {ChannelInbox} from '../../../../../backend/src/services/channel-inbox';
export async function GET(request:Request){
  const params=new URL(request.url).searchParams,expected=process.env.WHATSAPP_VERIFY_TOKEN||'',supplied=params.get('hub.verify_token')||'';
  if(!expected||Buffer.byteLength(expected)!==Buffer.byteLength(supplied)||!timingSafeEqual(Buffer.from(expected),Buffer.from(supplied))||params.get('hub.mode')!=='subscribe')return new Response('Verification denied',{status:403});
  const challenge=params.get('hub.challenge')||'';if(!/^\d{1,100}$/.test(challenge))return new Response('Invalid challenge',{status:400});
  return new Response(challenge,{headers:{'Content-Type':'text/plain'}});
}
export async function POST(request:Request){
  try{
    if(!process.env.WHATSAPP_APP_SECRET)return NextResponse.json({error:'WhatsApp is not configured.'},{status:503});
    const raw=await boundedDeviceBody(request,262144);
    if(!verifyWhatsAppSignature(raw,request.headers.get('x-hub-signature-256'),process.env.WHATSAPP_APP_SECRET))return NextResponse.json({error:'Invalid signature.'},{status:401});
    let messages;try{messages=whatsappMessages(JSON.parse(raw.toString('utf8')));}catch{return NextResponse.json({error:'Invalid WhatsApp event.'},{status:400});}
    const pool=getDirectDbPool(),inbox=new ChannelInbox(pool);
    for(const message of messages){
      const account=await pool.query("SELECT connector_id FROM channel_accounts WHERE provider_subject=$1",[`whatsapp:${message.phone}`]);
      if(account.rows[0])await inbox.receive(account.rows[0].connector_id,message.id,message.sender,message.text);
    }
    return NextResponse.json({received:true});
  }catch{return NextResponse.json({error:'WhatsApp delivery unavailable; retry.'},{status:503});}
}
