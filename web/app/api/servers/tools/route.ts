import {NextResponse} from 'next/server';
import {requireTenant,requireOperator,RequestError} from '@/utils/tenant-context';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {getDirectDbPool} from '@/utils/direct-db';
import {DeviceError,digest} from '../../../../../backend/src/services/device-protocol';
import {ServerAccessManager} from '../../../../../ai/src/server-access-manager';
import {ServerClassifier} from '../../../../../ai/src/server-classifier';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 const {organizationId,user,role}=await requireTenant();
 let body;try{body=JSON.parse((await boundedDeviceBody(request,16384)).toString('utf8'));}catch(e){if(e instanceof DeviceError)throw e;throw new RequestError('Invalid JSON.',400);}
 const pool=getDirectDbPool();let result;
 if(body?.action==='generate_key'){
  requireOperator(role);
  if(typeof body.label!=='string'||!/^[A-Za-z0-9_.@-]{1,80}$/.test(body.label))throw new RequestError('Provide a simple key label of 1–80 characters.',400);
  const keypair=ServerAccessManager.generateSshKeypair(body.label);
  await pool.query("INSERT INTO organization_audit_events(organization_id,actor_id,action_name,parameters_hash) VALUES($1,$2,'server.key.generated',$3)",[organizationId,user.id,digest('ed25519')]);
  result={publicKey:keypair.publicKey,privateKey:keypair.opensshPrivateKey};
 }else if(body?.action==='diagnose'){
  if(typeof body.errorOutput!=='string'||!body.errorOutput.trim()||body.errorOutput.length>8000||!['SSH_CREDENTIAL','AGENT_ENROLLMENT','CLOUD_PROVIDER_API'].includes(body.accessType))throw new RequestError('Select an access type and supply up to 8000 characters of error text.',400);
  result={diagnosis:ServerAccessManager.diagnoseAccessError(body.accessType,body.errorOutput),source:'submitted error text; no connection attempted'};
 }else if(body?.action==='classify'){
  if(typeof body.serverId!=='string'||!/^[a-f0-9-]{36}$/i.test(body.serverId))throw new RequestError('Select a server.',400);
  const server=(await pool.query(`SELECT s.hostname,s.os_type,c.last_heartbeat_at,
   COALESCE((SELECT json_agg(json_build_object('name',i.service_name,'lastSeenAt',i.last_seen_at)) FROM services_inventory i WHERE i.server_id=s.id),'[]') AS services
   FROM servers s JOIN environments e ON e.id=s.environment_id JOIN projects p ON p.id=e.project_id
   JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2
   LEFT JOIN connectors c ON c.id=s.connector_id WHERE p.organization_id=$1 AND s.id=$3`,[organizationId,user.id,body.serverId])).rows[0];
  if(!server)throw new RequestError('Server unavailable to this account.',404);
  const services=Array.isArray(server.services)?server.services:[];
  result={features:ServerClassifier.classify({hostname:server.hostname,systemdUnits:services.map((s:{name:string})=>s.name)}),source:'Recorded hostname and service inventory; heuristic recommendation',lastHeartbeat:server.last_heartbeat_at||null,services};
 }else throw new RequestError('Unknown server tool.',400);
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(e){const known=e instanceof RequestError||e instanceof DeviceError;return NextResponse.json({error:known?e.message:'Server tool unavailable.'},{status:known?e.status:503,headers:{'Cache-Control':'no-store'}});}}
