import assert from 'node:assert/strict';
import {notificationText,sendNotificationEmail} from '../services/src/communication/email-notifications';
export async function testEmailNotifications(){
  const email={id:'fixture',to:'user@example.test',kind:'deployment',sourceId:'event',state:'success',commit:'a'.repeat(40),environment:'production'};
  assert.match(notificationText(email,'https://app.example.test').subject,/reported successful/);
  assert.throws(()=>notificationText({...email,state:'pending'},'https://app.example.test'),/Terminal/);
  assert.throws(()=>notificationText(email,'http://localhost'),/HTTPS/);
  assert.match(notificationText({...email,kind:'security_event'},'https://app.example.test').text,/before concluding/);
  const old={key:process.env.RYVIX_NOTIFICATION_RESEND_KEY,from:process.env.RYVIX_NOTIFICATION_FROM,url:process.env.RYVIX_PUBLIC_URL,provider:process.env.RYVIX_NOTIFICATION_PROVIDER};
  try{process.env.RYVIX_NOTIFICATION_PROVIDER='resend';process.env.RYVIX_NOTIFICATION_RESEND_KEY='fixture-only';process.env.RYVIX_NOTIFICATION_FROM='alerts@example.test';process.env.RYVIX_PUBLIC_URL='https://app.example.test';
    let calls=0;const request=(async(url:unknown,init:RequestInit)=>{calls++;assert.equal(url,'https://api.resend.com/emails');
      assert.equal((init.headers as Record<string,string>)['Idempotency-Key'],'ryvix-notification-fixture');const body=JSON.parse(init.body as string);assert.deepEqual(body.to,['user@example.test']);assert.ok(!body.html);return Response.json({id:'fixture-message'});}) as typeof fetch;
    assert.equal(await sendNotificationEmail(email,request),'fixture-message');
    await assert.rejects(sendNotificationEmail({...email,to:'user@example.test\r\nBcc:attacker@example.test'},request));assert.equal(calls,1);
    delete process.env.RYVIX_NOTIFICATION_PROVIDER;
    let sent=0;assert.equal(await sendNotificationEmail(email,request,async mail=>{sent++;assert.equal(mail.to,email.to);assert.match(mail.messageId!,/^<ryvix-/);return 'smtp-fixture';}),'smtp-fixture');assert.equal(sent,1);assert.equal(calls,1);
    await assert.rejects(sendNotificationEmail(email,request,async()=>{throw new Error('Unknown SMTP outcome');}),/Unknown/);assert.equal(calls,1,'No automatic fallback after uncertain SMTP delivery');
  }finally{for(const [name,value] of [['RYVIX_NOTIFICATION_RESEND_KEY',old.key],['RYVIX_NOTIFICATION_FROM',old.from],['RYVIX_PUBLIC_URL',old.url],['RYVIX_NOTIFICATION_PROVIDER',old.provider]]){if(value===undefined)delete process.env[name!];else process.env[name!]=value;}}
}
