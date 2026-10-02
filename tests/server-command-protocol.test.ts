import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID,sign} from 'node:crypto';
import {signCommand,verifyCommand,allowedService,type DeviceCommand} from '../backend/src/services/command-protocol';
import {signingMessage,verifyDeviceRequest} from '../backend/src/services/device-protocol';
export async function testServerCommandProtocol(){
  const pair=generateKeyPairSync('ed25519');
  const privateKey=pair.privateKey.export({format:'der',type:'pkcs8'}).toString('base64');
  const publicKey=pair.publicKey.export({format:'der',type:'spki'}).toString('base64');
  const now=Date.now(),server=randomUUID();
  const command:DeviceCommand={version:1,id:randomUUID(),approvalId:randomUUID(),serverId:server,action:'restart_service',service:'nginx.service',issuedAt:now,expiresAt:now+120000};
  const envelope=signCommand(command,privateKey);
  assert.deepEqual(verifyCommand(envelope,server,publicKey,'nginx.service',now),command);
  assert.throws(()=>verifyCommand(envelope,randomUUID(),publicKey,'nginx.service',now));
  assert.throws(()=>verifyCommand(envelope,server,publicKey,'other.service',now));
  assert.throws(()=>verifyCommand(envelope,server,publicKey,'nginx.service',now+120001));
  assert.throws(()=>verifyCommand({...envelope,payload:envelope.payload+'x'},server,publicKey,'nginx.service',now));
  assert.equal(allowedService('nginx.service; reboot','nginx.service; reboot'),false);
  const body=Buffer.from(JSON.stringify({serverId:server})),timestamp=String(now),nonce=randomUUID();
  const path='/api/connector/commands/poll';
  const headers=new Headers({'x-ryvix-timestamp':timestamp,'x-ryvix-nonce':nonce,'x-ryvix-signature':sign(null,signingMessage(body,timestamp,nonce,path),pair.privateKey).toString('base64')});
  assert.equal(verifyDeviceRequest(body,headers,publicKey,now,path),nonce);
  assert.throws(()=>verifyDeviceRequest(body,headers,publicKey,now),/signature rejected/);
}
