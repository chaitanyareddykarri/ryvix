import assert from 'node:assert/strict';
import {cloudTarget} from '../backend/src/services/cloud-recovery-store';
import {sendWhatsAppTemplate,whatsappStatuses} from '../services/src/communication/whatsapp';

export async function testRecoveryOutbound(){
  const server='11111111-1111-4111-8111-111111111111';
  assert.deepEqual(cloudTarget(server,`${server}:aws:i-12345678`),{provider:'aws',instance:'i-12345678'});
  assert.throws(()=>cloudTarget(server,''));
  assert.throws(()=>cloudTarget(server,`${server}:aws:i-12345678,${server}:aws:i-87654321`));
  let calls=0;
  const request=(async(url:unknown,init:RequestInit)=>{
    calls++;assert.equal(url,'https://graph.facebook.com/v25.0/123456/messages');
    const body=JSON.parse(init.body as string);assert.equal(body.type,'template');
    assert.equal(body.template.components[0].parameters[0].text,'incident-id');
    return Response.json({messages:[{id:'wamid.fixture'}]});
  }) as typeof fetch;
  const input={phone:'123456',recipient:'919999999999',token:'fixture',version:'v25.0',template:'ryvix_p1',language:'en_US',incident:'incident-id'};
  assert.equal(await sendWhatsAppTemplate(input,request),'wamid.fixture');
  await assert.rejects(sendWhatsAppTemplate({...input,phone:'../../me'},request));
  assert.equal(calls,1);
  await assert.rejects(sendWhatsAppTemplate(input,(async()=>Response.json({messages:[]})) as typeof fetch));
  assert.deepEqual(whatsappStatuses({entry:[{changes:[{field:'messages',value:{metadata:{phone_number_id:'123456'},statuses:[{id:'wamid.fixture',status:'delivered',recipient_id:'919999999999'}]}}]}]}),
    [{phone:'123456',id:'wamid.fixture',status:'delivered',recipient:'919999999999'}]);
}
