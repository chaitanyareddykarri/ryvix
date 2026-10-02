import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { DeviceError, deviceUuid } from './device-protocol';

export interface DeviceCommand {version:1;id:string;serverId:string;approvalId:string;action:'restart_service';service:string;issuedAt:number;expiresAt:number;}
export interface CommandEnvelope {payload:string;signature:string;}
export const commandDomain='ryvix-command-v1\n';
export function allowedService(service:unknown,allowlist=process.env.RYVIX_COMMAND_SERVICES||''):service is string {
  return typeof service==='string' && /^[a-zA-Z0-9][a-zA-Z0-9_.@-]{0,119}\.service$/.test(service) && allowlist.split(',').map(s=>s.trim()).includes(service);
}
export function signCommand(command:DeviceCommand,key=process.env.RYVIX_COMMAND_PRIVATE_KEY||''):CommandEnvelope {
  const privateKey=createPrivateKey({key:Buffer.from(key,'base64'),format:'der',type:'pkcs8'});
  if(privateKey.asymmetricKeyType!=='ed25519')throw new DeviceError('Command signing unavailable.',503);
  const payload=Buffer.from(JSON.stringify(command)).toString('base64url');
  return {payload,signature:sign(null,Buffer.from(commandDomain+payload),privateKey).toString('base64')};
}
export function verifyCommand(envelope:CommandEnvelope,serverId:string,publicKey:string,allowlist:string,now=Date.now()):DeviceCommand {
  if(!envelope||typeof envelope.payload!=='string'||envelope.payload.length>4096||typeof envelope.signature!=='string')throw new DeviceError('Invalid command');
  const key=createPublicKey({key:Buffer.from(publicKey,'base64'),format:'der',type:'spki'});
  if(key.asymmetricKeyType!=='ed25519'||!verify(null,Buffer.from(commandDomain+envelope.payload),key,Buffer.from(envelope.signature,'base64')))throw new DeviceError('Command signature rejected');
  const command=JSON.parse(Buffer.from(envelope.payload,'base64url').toString()) as DeviceCommand;
  if(command.version!==1||!deviceUuid.test(command.id)||!deviceUuid.test(command.approvalId)||command.serverId!==serverId||command.action!=='restart_service'||
    !allowedService(command.service,allowlist)||!Number.isSafeInteger(command.issuedAt)||!Number.isSafeInteger(command.expiresAt)||
    command.issuedAt>now+30000||command.expiresAt<=now||command.expiresAt-command.issuedAt!==120000)throw new DeviceError('Expired or unauthorized command');
  return command;
}
