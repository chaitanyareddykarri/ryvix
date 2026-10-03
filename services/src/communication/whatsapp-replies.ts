import {channelProviderJson} from '../../../backend/src/services/channel-accounts';
import {sendWhatsAppTemplate} from './whatsapp';
export async function sendWhatsAppReply(input:{phone:string;recipient:string;token:string;body:string;id:string;template:boolean}){
  const version=process.env.WHATSAPP_GRAPH_VERSION||'';
  if(!/^v\d+\.\d+$/.test(version)||!/^\d{5,30}$/.test(input.phone)||!/^\d{8,15}$/.test(input.recipient)||!input.token)throw new Error('Reply configuration unavailable');
  if(input.template)return sendWhatsAppTemplate({...input,version,template:process.env.WHATSAPP_ASSISTANT_UPDATE_TEMPLATE||'',language:process.env.WHATSAPP_ASSISTANT_UPDATE_LANGUAGE||'en_US',incident:input.id});
  if(!input.body||input.body.length>3500)throw new Error('Reply size invalid');
  const response=await channelProviderJson(`https://graph.facebook.com/${version}/${input.phone}/messages`,{method:'POST',headers:{Authorization:`Bearer ${input.token}`,'Content-Type':'application/json'},
    body:JSON.stringify({messaging_product:'whatsapp',to:input.recipient,type:'text',text:{body:input.body,preview_url:false}})},65536);
  const id=response.messages?.[0]?.id;if(typeof id!=='string'||!id||id.length>512)throw new Error('Reply acceptance missing');return id;
}
