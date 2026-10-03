import assert from 'node:assert/strict';
import {normalizeWhatsAppPhone,phoneOtpDigest} from '../backend/src/services/whatsapp-phone';
import {sendWhatsAppOtp} from '../services/src/communication/whatsapp-otp';
import {smtpSettings,sendSmtpMail} from '../services/src/communication/smtp';
export async function testWhatsAppPhone(){
  assert.equal(normalizeWhatsAppPhone('+1 (555) 555-0123'),'+15555550123');
  for(const value of ['555123','+0123456789','+123\n456789',null,'+1234567890123456'])assert.throws(()=>normalizeWhatsAppPhone(value));
  const keys=['WHATSAPP_OTP_SECRET','WHATSAPP_OTP_TEMPLATE','WHATSAPP_OTP_LANGUAGE','WHATSAPP_GRAPH_VERSION','SMTP_USER','SMTP_PASSWORD','SMTP_PORT'];
  const old=keys.map(k=>process.env[k]),original=globalThis.fetch;
  try{process.env.WHATSAPP_OTP_SECRET='fixture-only-secret-with-more-than-32-characters';
    assert.notEqual(phoneOtpDigest('first','123456'),phoneOtpDigest('second','123456'));
    process.env.WHATSAPP_OTP_TEMPLATE='fixture_otp';process.env.WHATSAPP_OTP_LANGUAGE='en_US';process.env.WHATSAPP_GRAPH_VERSION='v23.0';
    globalThis.fetch=async(url,init)=>{assert.equal(init?.redirect,'error');const body=JSON.parse(String(init?.body));
      assert.equal(body.template.components[0].parameters[0].text,'123456');assert.equal(body.template.components[1].parameters[0].text,'123456');return Response.json({messages:[{id:'fixture'}]});};
    await sendWhatsAppOtp({phoneId:'123456789',recipient:'+15555550123',token:'fixture',code:'123456'});
    assert.throws(()=>smtpSettings({SMTP_USER:'fixture',SMTP_PASSWORD:'fixture',SMTP_PORT:'25'}),/TLS/);
    const settings=smtpSettings({SMTP_USER:'fixture',SMTP_PASSWORD:'fixture',SMTP_PORT:'587'});assert.equal(settings.requireTLS,true);assert.equal(settings.tls.rejectUnauthorized,true);
    process.env.SMTP_USER='fixture';process.env.SMTP_PASSWORD='fixture';process.env.SMTP_PORT='465';let closed=false;
    const create=(()=>({sendMail:async()=>({accepted:[],rejected:['fixture'],messageId:'fixture'}),close:()=>{closed=true;}})) as any;
    await assert.rejects(sendSmtpMail({from:'from@example.test',to:'to@example.test',subject:'fixture',text:'fixture'},create),/acceptance/);assert.equal(closed,true);
  }finally{globalThis.fetch=original;keys.forEach((k,i)=>{if(old[i]===undefined)delete process.env[k];else process.env[k]=old[i];});}
}
