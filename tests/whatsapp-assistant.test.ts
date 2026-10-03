import assert from 'node:assert/strict';
import {parseWhatsAppIntent,routeWhatsApp} from '../ai/src/whatsapp-router';
import {modelGateway} from '../ai/src/model-gateway';
import {sendWhatsAppReply} from '../services/src/communication/whatsapp-replies';
import {whatsappMessages} from '../services/src/communication/whatsapp';
export async function testWhatsAppAssistant(){
  assert.throws(()=>parseWhatsAppIntent('{"intent":"execute_shell","reply":"done"}'),/Invalid/);
  assert.throws(()=>parseWhatsAppIntent('{"intent":"coding","reply":"done"}'),/Incomplete/);
  assert.equal(parseWhatsAppIntent('```json\n{"intent":"status","reply":""}\n```').intent,'status');
  const fetcher=globalThis.fetch,stream=modelGateway.stream,version=process.env.WHATSAPP_GRAPH_VERSION,template=process.env.WHATSAPP_ASSISTANT_UPDATE_TEMPLATE,language=process.env.WHATSAPP_ASSISTANT_UPDATE_LANGUAGE;
  try{modelGateway.stream=async function*(messages,options){assert.ok(options?.signal);options?.onProvider?.('fixture','fixture');yield '{"intent":"answer","reply":"Recorded evidence only."}';};
    const answer=await routeWhatsApp({question:'Help',context:{},history:[]});assert.equal(answer.provider,'fixture');assert.equal(answer.promptTokens,null,'Missing usage must not become estimated tokens');
    process.env.WHATSAPP_GRAPH_VERSION='v23.0';process.env.WHATSAPP_ASSISTANT_UPDATE_TEMPLATE='fixture_update';process.env.WHATSAPP_ASSISTANT_UPDATE_LANGUAGE='en_US';
    let calls=0;globalThis.fetch=async(url,init)=>{calls++;assert.equal(init?.redirect,'error');const body=JSON.parse(String(init?.body));
      if(body.type==='text'){assert.equal(body.text.preview_url,false);assert.equal(body.text.body,'Fixture reply');}else{assert.equal(body.template.components[0].parameters[0].text,'fixture-id');assert.ok(!JSON.stringify(body).includes('private details'));}
      return Response.json({messages:[{id:'fixture-message'}]});};
    const input={phone:'123456789',recipient:'15555550123',token:'fixture',body:'Fixture reply',id:'fixture-id',template:false};
    assert.equal(await sendWhatsAppReply(input),'fixture-message');await sendWhatsAppReply({...input,template:true,body:'private details'});assert.equal(calls,2);
    await assert.rejects(sendWhatsAppReply({...input,body:'x'.repeat(3501)}));assert.equal(calls,2);
    const payload={object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{metadata:{phone_number_id:'123456789'},messages:[{id:'fixture',from:'15555550123',type:'text',timestamp:'1700000000',text:{body:'hello'}}]}}]}]};
    assert.equal(whatsappMessages(payload)[0].timestamp,1700000000);
  }finally{globalThis.fetch=fetcher;modelGateway.stream=stream;for(const [key,value] of [['WHATSAPP_GRAPH_VERSION',version],['WHATSAPP_ASSISTANT_UPDATE_TEMPLATE',template],['WHATSAPP_ASSISTANT_UPDATE_LANGUAGE',language]]){if(value===undefined)delete process.env[key!];else process.env[key!]=value;}}
}
