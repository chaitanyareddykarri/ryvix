import {OAuth2Client} from 'google-auth-library';
import type {Pool} from 'pg';
import {ChannelError} from './channel-inbox';
const verifier=new OAuth2Client();
export async function acceptGmailPush(pool:Pool,authorization:string|null,body:any,
  verify=async(token:string,audience:string)=>(await verifier.verifyIdToken({idToken:token,audience})).getPayload()){
  const audience=process.env.GMAIL_PUBSUB_AUDIENCE,email=process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT,subscription=process.env.GMAIL_PUBSUB_SUBSCRIPTION;
  if(!audience||!email||!subscription)throw new ChannelError('Gmail push is not configured.',503);
  if(!authorization?.startsWith('Bearer ')||authorization.length>16000)throw new ChannelError('Push authentication required.',401);
  let claims;try{claims=await verify(authorization.slice(7),audience);}catch{throw new ChannelError('Push authentication denied.',401);}
  if(claims?.email!==email||claims.email_verified!==true||!['accounts.google.com','https://accounts.google.com'].includes(claims.iss||''))throw new ChannelError('Push identity denied.',403);
  if(body?.subscription!==subscription||typeof body.message?.messageId!=='string'||!body.message.messageId.length||body.message.messageId.length>200||
    typeof body.message?.data!=='string'||body.message.data.length>4096)throw new ChannelError('Invalid push envelope.',400);
  let data;try{data=JSON.parse(Buffer.from(body.message.data,'base64').toString('utf8'));}catch{throw new ChannelError('Invalid push data.',400);}
  if(typeof data.emailAddress!=='string'||data.emailAddress.length>320||typeof data.historyId!=='string'||!/^\d+$/.test(data.historyId))throw new ChannelError('Invalid mailbox event.',400);
  await pool.query(`INSERT INTO gmail_push_events(provider_message_id,connector_id)
    SELECT $1,a.connector_id FROM channel_accounts a JOIN connectors c ON c.id=a.connector_id
    JOIN environments e ON e.id=c.environment_id JOIN projects p ON p.id=e.project_id
    JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=a.owner_id
    WHERE a.provider_subject=$2 AND c.connector_type='gmail' AND c.status='active'
    AND a.gmail_watch_expires_at>now() AND m.role IN ('owner','admin')
    ON CONFLICT DO NOTHING`,[body.message.messageId,'gmail:'+data.emailAddress.toLowerCase()]);
  // The notification historyId never advances the trusted polling cursor.
}
