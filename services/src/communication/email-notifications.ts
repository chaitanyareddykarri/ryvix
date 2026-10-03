import {sendSmtpMail} from './smtp';
import {createHash} from 'node:crypto';
export interface NotificationMail {id:string;to:string;kind:string;sourceId:string;state?:string;commit?:string;environment?:string;}
export function notificationText(mail:NotificationMail,publicUrl=process.env.RYVIX_PUBLIC_URL||''){
  const origin=new URL(publicUrl);if(origin.protocol!=='https:'||origin.username||origin.password)throw new Error('Public HTTPS application URL required');
  const deployment=mail.kind==='deployment';
  if(deployment&&!['success','failure','error'].includes(mail.state||''))throw new Error('Terminal deployment evidence required');
  const subject=deployment?mail.state==='success'?'Ryvix: deployment reported successful':'Ryvix: deployment failed':'Ryvix: security alert requires review';
  const text=deployment?`Your approved release has a verified GitHub deployment status: ${mail.state}.\nEnvironment: ${mail.environment}\nCommit: ${mail.commit}\nEvent: ${mail.sourceId}\n\nThis reports the deployment provider result. Runtime health and the executing commit require separate verification.`:
    `A security signal was recorded for your environment. Review the evidence before concluding that an attack succeeded.\nEvent: ${mail.sourceId}\nNo raw logs or credentials are included in this email.`;
  return {subject,text:`${text}\n\nReview: ${origin.origin}/${deployment?'deployments':'servers'}\nNotification preferences: ${origin.origin}/notifications`};
}
export async function sendNotificationEmail(mail:NotificationMail,request:typeof fetch=fetch,smtp=sendSmtpMail){
  const provider=process.env.RYVIX_NOTIFICATION_PROVIDER||'smtp';
  const key=process.env.RYVIX_NOTIFICATION_RESEND_KEY||process.env.RESEND_API_KEY,from=process.env.RYVIX_NOTIFICATION_FROM||process.env.SMTP_USER||'';
  if(! /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)||! /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(mail.to)||/[\r\n]/.test(from+mail.to))throw new Error('Verified notification sender and recipient required');
  const content=notificationText(mail);
  if(provider==='smtp')return smtp({from,to:mail.to,...content,messageId:`<ryvix-${createHash('sha256').update(mail.id).digest('hex')}@${from.split('@')[1]}>`});
  if(provider!=='resend'||!key)throw new Error('Configured notification transport unavailable');
  const response=await request('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`ryvix-notification-${mail.id}`},
    body:JSON.stringify({from,to:[mail.to],subject:content.subject,text:content.text})});
  if(!response.ok||!response.body){await response.body?.cancel();throw new Error('Notification provider did not accept message');}
  const reader=response.body.getReader();let bytes=0,text='';const decoder=new TextDecoder();
  try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>65536)throw new Error('Provider response too large');text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const id=JSON.parse(text).id;if(typeof id!=='string'||!id||id.length>512)throw new Error('Provider acceptance missing');return id;
}
