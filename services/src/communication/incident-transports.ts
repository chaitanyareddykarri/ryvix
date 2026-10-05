import {twilioCallbackUrl} from './twilio-status';
export type IncidentTransport='slack'|'pagerduty'|'twilio';
export type IncidentMessage={id:string;incident:string;destination:string;provider:IncidentTransport;secret:string};

/** Fixed provider endpoints; an acceptance is not a delivery receipt. */
export async function sendIncidentNotification(job:IncidentMessage):Promise<string>{
  const text=`Ryvix P1 incident ${job.incident}. Open your Ryvix dashboard to investigate.`;
  let url:string,body:string,headers:Record<string,string>;
  if(job.provider==='slack'){
    if(!/^[CGD][A-Z0-9]{8,30}$/.test(job.destination)||!job.secret||job.secret.length>4096)throw new Error('Invalid Slack target');
    url='https://slack.com/api/chat.postMessage';headers={Authorization:`Bearer ${job.secret}`,'Content-Type':'application/json'};
    body=JSON.stringify({channel:job.destination,text,mrkdwn:false,unfurl_links:false,unfurl_media:false});
  }else if(job.provider==='pagerduty'){
    const routingKey=job.secret.startsWith('{')?JSON.parse(job.secret).routingKey:job.secret;
    if(!/^[a-zA-Z0-9]{32}$/.test(routingKey))throw new Error('Invalid PagerDuty integration');
    url='https://events.pagerduty.com/v2/enqueue';headers={'Content-Type':'application/json'};
    body=JSON.stringify({routing_key:routingKey,event_action:'trigger',dedup_key:job.id,payload:{summary:text,source:'Ryvix',severity:'critical'}});
  }else if(job.provider==='twilio'){
    const credential=JSON.parse(job.secret);
    if(!/^AC[a-f0-9]{32}$/i.test(credential.accountSid)||typeof credential.authToken!=='string'||!credential.authToken||credential.authToken.length>256||
      !/^\+[1-9]\d{6,14}$/.test(credential.from)||!/^\+[1-9]\d{6,14}$/.test(job.destination))throw new Error('Invalid SMS configuration');
    url=`https://api.twilio.com/2010-04-01/Accounts/${credential.accountSid}/Messages.json`;
    headers={Authorization:`Basic ${Buffer.from(`${credential.accountSid}:${credential.authToken}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'};
    body=new URLSearchParams({From:credential.from,To:job.destination,Body:text,...(process.env.RYVIX_TWILIO_STATUS_ENABLED==='true'?{StatusCallback:twilioCallbackUrl(job.id)}:{})}).toString();
  }else throw new Error('Unsupported transport');
  const response=await fetch(url,{method:'POST',headers,body,redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok||!response.body){await response.body?.cancel();throw new Error('Provider did not acknowledge notification');}
  const reader=response.body.getReader();let bytes=0;const chunks:Uint8Array[]=[];
  let result:any;try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>65536)throw new Error('Oversized provider response');chunks.push(chunk.value);}
    result=JSON.parse(Buffer.concat(chunks).toString());}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const id=job.provider==='slack'?(result.ok===true&&result.channel===job.destination?result.ts:null):job.provider==='pagerduty'?(result.status==='success'&&result.dedup_key===job.id?result.dedup_key:null):result.sid;
  if(typeof id!=='string'||!id||id.length>200)throw new Error('Provider acknowledgment unavailable');
  return id;
}
