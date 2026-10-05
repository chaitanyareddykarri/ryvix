import {createHmac,timingSafeEqual} from 'node:crypto';
export function twilioCallbackUrl(id:string){
 if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))throw new Error('Notification UUID required');
 const base=new URL(process.env.RYVIX_PUBLIC_URL||'');if(base.protocol!=='https:'||base.username||base.password)throw new Error('Public HTTPS URL required');
 return `${base.origin}/api/webhooks/twilio?notification=${id}`;
}
export function verifyTwilioStatus(url:string,raw:string,signature:string,token:string){
 if(Buffer.byteLength(raw)>8192||!token||token.length>256||!signature||signature.length>100)throw new Error('Invalid callback');
 const params=new URLSearchParams(raw),values:Record<string,string>=Object.create(null);
 for(const [key,value] of params){if(Object.hasOwn(values,key)||!/^\w{1,100}$/.test(key)||value.length>2048||Object.keys(values).length>=60)throw new Error('Invalid callback parameters');values[key]=value;}
 const expected=createHmac('sha1',token).update(url+Object.keys(values).sort().map(key=>key+values[key]).join('')).digest('base64');
 const supplied=Buffer.from(signature);if(supplied.length!==Buffer.byteLength(expected)||!timingSafeEqual(supplied,Buffer.from(expected)))throw new Error('Invalid callback signature');
 if(!/^SM[a-f0-9]{32}$/i.test(values.MessageSid||'')||!['queued','sent','delivered','failed','undelivered'].includes(values.MessageStatus))throw new Error('Unsupported message status');
 return values;
}
