import {channelProviderJson} from '../../../backend/src/services/channel-accounts';
export function otpConfiguration(){
  const template=process.env.WHATSAPP_OTP_TEMPLATE||'',language=process.env.WHATSAPP_OTP_LANGUAGE||'en_US',version=process.env.WHATSAPP_GRAPH_VERSION||'';
  if(!/^[a-z0-9_]{1,128}$/.test(template)||! /^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language)||!/^v\d+\.\d+$/.test(version))throw new Error('WhatsApp authentication template configuration required');
  return {template,language,version};
}
export async function sendWhatsAppOtp(input:{phoneId:string;recipient:string;token:string;code:string}){
  const {template,language,version}=otpConfiguration();
  if(!/^\d{5,30}$/.test(input.phoneId)||!/^\+[1-9]\d{7,14}$/.test(input.recipient)||!/^\d{6}$/.test(input.code)||!input.token)throw new Error('Invalid OTP dispatch');
  const result=await channelProviderJson(`https://graph.facebook.com/${version}/${input.phoneId}/messages`,{
    method:'POST',headers:{Authorization:`Bearer ${input.token}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:input.recipient.slice(1),type:'template',
      template:{name:template,language:{code:language},components:[{type:'body',parameters:[{type:'text',text:input.code}]},
        {type:'button',sub_type:'url',index:'0',parameters:[{type:'text',text:input.code}]}]}})},65536);
  if(typeof result.messages?.[0]?.id!=='string'||!result.messages[0].id||result.messages[0].id.length>512)throw new Error('OTP acceptance missing');
}
