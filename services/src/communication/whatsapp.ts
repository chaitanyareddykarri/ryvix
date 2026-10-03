import {createHmac,timingSafeEqual} from 'node:crypto';

export async function sendWhatsAppTemplate(input:{phone:string;recipient:string;token:string;version:string;template:string;language:string;incident:string},request:typeof fetch=fetch){
  if(!/^\d{5,30}$/.test(input.phone)||!/^\d{5,20}$/.test(input.recipient)||!/^v\d+\.\d+$/.test(input.version)||
    !/^[a-z0-9_]{1,128}$/.test(input.template)||! /^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(input.language)||!input.token||input.incident.length>100)
    throw new Error('Invalid WhatsApp template configuration');
  const response=await request(`https://graph.facebook.com/${input.version}/${input.phone}/messages`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{Authorization:`Bearer ${input.token}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:input.recipient,type:'template',
      template:{name:input.template,language:{code:input.language},components:[{type:'body',parameters:[{type:'text',text:input.incident}]}]}})});
  if(!response.ok){await response.body?.cancel();throw new Error('WhatsApp provider did not accept the alert');}
  if(!response.body)throw new Error('WhatsApp response missing');
  const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,raw='';
  try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;
    if(bytes>65536)throw new Error('WhatsApp response too large');raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const id=JSON.parse(raw).messages?.[0]?.id;if(typeof id!=='string'||id.length>512||!id)throw new Error('WhatsApp acceptance ID missing');return id;
}
export function whatsappStatuses(payload:any){
  const results:Array<{phone:string;id:string;status:string;recipient:string}>=[];
  for(const entry of (payload?.entry||[]).slice(0,20))for(const change of (entry.changes||[]).slice(0,20)){
    if(change.field!=='messages')continue;const value=change.value,phone=value?.metadata?.phone_number_id;
    if(!/^\d{5,30}$/.test(phone||''))continue;
    for(const s of (value.statuses||[]).slice(0,100))if(typeof s.id==='string'&&s.id.length<=512&&['sent','delivered','read','failed'].includes(s.status)&&/^\d{5,20}$/.test(s.recipient_id||'')){
      results.push({phone,id:s.id,status:s.status,recipient:s.recipient_id});if(results.length>100)throw new Error('Too many delivery statuses');
    }
  }return results;
}

export function verifyWhatsAppSignature(body:Buffer,signature:string|null,secret:string) {
  if(!secret||!signature||!/^sha256=[a-f0-9]{64}$/.test(signature))return false;
  return timingSafeEqual(createHmac('sha256',secret).update(body).digest(),Buffer.from(signature.slice(7),'hex'));
}
export function whatsappMessages(payload:any) {
  if(payload?.object!=='whatsapp_business_account'||!Array.isArray(payload.entry))throw new Error('Invalid WhatsApp payload');
  const messages:Array<{phone:string;id:string;sender:string;text:string;timestamp?:number}>=[];
  for(const entry of payload.entry.slice(0,20))for(const change of (entry.changes||[]).slice(0,20)){
    if(change.field!=='messages')continue;
    const value=change.value;if(!value||!/^\d{5,30}$/.test(value.metadata?.phone_number_id||''))continue;
    for(const message of (value.messages||[]).slice(0,100)){
      if(message.type!=='text'||typeof message.text?.body!=='string')continue;
      if(typeof message.id!=='string'||message.id.length>512||!/^\d{5,20}$/.test(message.from||'')||message.text.body.length>10000)throw new Error('Invalid WhatsApp message');
      if(message.text.body.trim())messages.push({phone:value.metadata.phone_number_id,id:message.id,sender:message.from,text:message.text.body,...(typeof message.timestamp==='string'&&/^\d{10}$/.test(message.timestamp)?{timestamp:Number(message.timestamp)}:{})});
      if(messages.length>100)throw new Error('Too many WhatsApp messages');
    }
  }
  return messages;
}
