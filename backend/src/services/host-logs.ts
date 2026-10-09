import type {Pool} from 'pg';
import {ContextBuilder} from '../../../ai/src/context/context-builder';
import {DeviceError,deviceUuid,digest,verifyDeviceRequest} from './device-protocol';
export interface HostLog {id:string;source:string;timestamp:string;message:string;severity:'info'|'warning'|'critical'}
export function parseHostLogs(raw:Buffer,now=Date.now()):{serverId:string;entries:HostLog[]} {
  if(raw.length>131072)throw new DeviceError('Log batch exceeds limit.',413);
  let body;try{body=JSON.parse(raw.toString());}catch{throw new DeviceError('Invalid log JSON.');}
  if(!deviceUuid.test(body?.serverId||'')||!Array.isArray(body.entries)||!body.entries.length||body.entries.length>50)throw new DeviceError('One to fifty log entries required.');
  const ids=new Set<string>();
  const entries=body.entries.map((e:any)=>{
    if(!e||!deviceUuid.test(e.id||'')||ids.has(e.id)||typeof e.source!=='string'||!/^[a-zA-Z0-9_.@-]{1,128}$/.test(e.source)||
      typeof e.timestamp!=='string'||!Number.isFinite(Date.parse(e.timestamp))||Math.abs(now-Date.parse(e.timestamp))>120000||
      !['info','warning','critical'].includes(e.severity)||typeof e.message!=='string'||!e.message.trim()||e.message.length>4096)throw new DeviceError('Invalid, duplicate or stale log entry.');
    ids.add(e.id);
    const message=ContextBuilder.sanitizeText(e.message)
      .replace(/\b(authorization|cookie|set-cookie)\s*:\s*[^\r\n]*/gi,'$1: [REDACTED]')
      .replace(/\b(password|passwd|secret|token|api[_-]?key)\s*[=:]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;]+)/gi,'$1=[REDACTED]')
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'');
    return {id:e.id,source:e.source,timestamp:new Date(e.timestamp).toISOString(),severity:e.severity,message};
  });
  return {serverId:body.serverId,entries};
}
export function detectLogSignals(entries:HostLog[]) {
  const signals:Array<{id:string;type:string;summary:string;timestamp:string}>=[];
  const failed=entries.filter(e=>/^(sshd|ssh)(?:\.service)?$/.test(e.source)&&/Failed password|authentication failure/i.test(e.message));
  if(failed.length>=5)signals.push({id:failed[0].id,type:'auth_bruteforce',summary:`Observed ${failed.length} SSH authentication failure log entries in one bounded batch; possible brute force, investigate.`,timestamp:failed[0].timestamp});
  for(const e of entries)if(/Out of memory: Killed process|oom-kill:/i.test(e.message))signals.push({id:e.id,type:'suspicious_activity',summary:'Observed an out-of-memory kill log entry. Resource exhaustion is not proof of an attack.',timestamp:e.timestamp});
  return signals;
}
export async function ingestHostLogs(pool:Pool,raw:Buffer,headers:Headers) {
  const batch=parseHostLogs(raw);const c=await pool.connect();
  try{
    await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='10s'");
    const device=(await c.query(`SELECT co.id,co.device_public_key,e.project_id FROM servers s JOIN connectors co ON co.id=s.connector_id AND co.environment_id=s.environment_id
      JOIN environments e ON e.id=s.environment_id WHERE s.id=$1 AND co.status='active' AND co.connector_type='server_inband' AND co.device_public_key IS NOT NULL FOR UPDATE OF co`,[batch.serverId])).rows[0];
    if(!device)throw new DeviceError('Enrolled log reporter required.',401);
    const nonce=verifyDeviceRequest(raw,headers,device.device_public_key,Date.now(),'/api/connector/logs');
    const count=(await c.query("SELECT count(*)::int AS n FROM connector_telemetry_receipts WHERE connector_id=$1 AND received_at>now()-interval '1 minute'",[device.id])).rows[0].n;
    if(count>=200)throw new DeviceError('Device rate limit exceeded.',429);
    const receipt=await c.query('INSERT INTO connector_telemetry_receipts(connector_id,nonce) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING nonce',[device.id,nonce]);
    if(!receipt.rowCount)throw new DeviceError('Log replay rejected.',409);
    const inserted:HostLog[]=[];
    for(const e of batch.entries){const result=await c.query(`INSERT INTO host_log_entries(server_id,event_id,observed_at,source,severity,message) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(server_id,event_id) DO NOTHING RETURNING event_id`,[batch.serverId,e.id,e.timestamp,e.source,e.severity,e.message]);if(result.rowCount)inserted.push(e);}
    for(const s of detectLogSignals(inserted))await c.query(`INSERT INTO security_events(server_id,device_event_id,event_type,severity,raw_evidence,detected_at)
      VALUES($1,$2,$3,'medium',$4::jsonb,$5) ON CONFLICT(server_id,device_event_id) WHERE device_event_id IS NOT NULL DO NOTHING`,[batch.serverId,s.id,s.type,JSON.stringify({summary:s.summary,source:'bounded_log_rule_v1'}),s.timestamp]);
    await c.query(`INSERT INTO audit_events(project_id,actor_type,action_name,parameters_hash,diff_summary,status) VALUES($1,'system','logs.ingest',$2,$3,'success')`,[device.project_id,digest(nonce),`Accepted ${inserted.length} redacted log entries`]);
    await c.query('COMMIT');return {received:inserted.length};
  }catch(error){await c.query('ROLLBACK').catch(()=>{});throw error;}finally{c.release();}
}
