import {createHmac,timingSafeEqual} from 'node:crypto';

export function verifyWhatsAppSignature(body:Buffer,signature:string|null,secret:string) {
  if(!secret||!signature||!/^sha256=[a-f0-9]{64}$/.test(signature))return false;
  return timingSafeEqual(createHmac('sha256',secret).update(body).digest(),Buffer.from(signature.slice(7),'hex'));
}
export function whatsappMessages(payload:any) {
  if(payload?.object!=='whatsapp_business_account'||!Array.isArray(payload.entry))throw new Error('Invalid WhatsApp payload');
  const messages:Array<{phone:string;id:string;sender:string;text:string}>=[];
  for(const entry of payload.entry.slice(0,20))for(const change of (entry.changes||[]).slice(0,20)){
    if(change.field!=='messages')continue;
    const value=change.value;if(!value||!/^\d{5,30}$/.test(value.metadata?.phone_number_id||''))continue;
    for(const message of (value.messages||[]).slice(0,100)){
      if(message.type!=='text'||typeof message.text?.body!=='string')continue;
      if(typeof message.id!=='string'||message.id.length>512||!/^\d{5,20}$/.test(message.from||'')||message.text.body.length>10000)throw new Error('Invalid WhatsApp message');
      if(message.text.body.trim())messages.push({phone:value.metadata.phone_number_id,id:message.id,sender:message.from,text:message.text.body});
      if(messages.length>100)throw new Error('Too many WhatsApp messages');
    }
  }
  return messages;
}
