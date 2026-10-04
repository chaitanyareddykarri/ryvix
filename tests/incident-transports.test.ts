import assert from 'node:assert/strict';
import {incidentTargets} from '../backend/src/services/incident-notifications';
import {sendIncidentNotification} from '../services/src/communication/incident-transports';
export async function testIncidentTransports(){
  const id='11111111-1111-4111-8111-111111111111';
  const target={id,environmentId:id,ownerId:id,vaultSecretRef:id,provider:'slack',destination:'C123456789',optedIn:true};
  assert.equal(incidentTargets(JSON.stringify([target])).length,1);
  assert.throws(()=>incidentTargets(JSON.stringify([{...target,optedIn:false}])));
  assert.throws(()=>incidentTargets(JSON.stringify([target,target])));
  assert.throws(()=>incidentTargets(JSON.stringify([{...target,destination:'https://attacker.example'}])));
  const original=global.fetch;const calls:Array<{url:string;init:RequestInit}>=[];
  try{
    global.fetch=async(url,init)=>{calls.push({url:String(url),init:init!});const json=String(url).includes('slack')?{ok:true,channel:target.destination,ts:'123.456'}:String(url).includes('pagerduty')?{status:'success',dedup_key:id}:{sid:'SM'+'a'.repeat(32)};return Response.json(json);};
    assert.equal(await sendIncidentNotification({id,incident:id,provider:'slack',destination:target.destination,secret:'fixture-token'}),'123.456');
    assert.equal(JSON.parse(String(calls[0].init.body)).mrkdwn,false);assert.equal(calls[0].init.redirect,'error');
    await sendIncidentNotification({id,incident:id,provider:'pagerduty',destination:'integration',secret:'a'.repeat(32)});
    assert.equal(JSON.parse(String(calls[1].init.body)).dedup_key,id);
    await sendIncidentNotification({id,incident:id,provider:'twilio',destination:'+15555550123',secret:JSON.stringify({accountSid:'AC'+'a'.repeat(32),authToken:'fixture',from:'+15555550124'})});
    assert.ok(calls[2].url.startsWith('https://api.twilio.com/'));assert.equal(new URLSearchParams(String(calls[2].init.body)).get('To'),'+15555550123');
    global.fetch=async()=>Response.json({ok:false,error:'not_authed'});
    await assert.rejects(()=>sendIncidentNotification({id,incident:id,provider:'slack',destination:target.destination,secret:'fixture'}));
  }finally{global.fetch=original;}
}
