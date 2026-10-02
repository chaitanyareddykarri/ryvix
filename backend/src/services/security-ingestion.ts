import type {Pool} from 'pg';
import {DeviceError,deviceUuid,digest,verifyDeviceRequest} from './device-protocol';
import {ContextBuilder} from '../../../ai/src/context/context-builder';
export async function ingestSecuritySignals(pool:Pool,raw:Buffer,headers:Headers){
  let body;try{body=JSON.parse(raw.toString());}catch{throw new DeviceError('Invalid security report');}
  if(!deviceUuid.test(body?.serverId||'')||!Array.isArray(body.events)||!body.events.length||body.events.length>20)throw new DeviceError('Bounded server security events required');
  for(const e of body.events)if(!e||typeof e!=='object'||!deviceUuid.test(e.id||'')||!['auth_bruteforce','http_attack','malware','suspicious_activity'].includes(e.type)||!['critical','high','medium','low'].includes(e.severity)||
    typeof e.observedAt!=='string'||!Number.isFinite(Date.parse(e.observedAt))||Math.abs(Date.now()-Date.parse(e.observedAt))>120000||typeof e.summary!=='string'||!e.summary.trim()||e.summary.length>1000)
    throw new DeviceError('Measured event identity, fresh observation and summary required');
  const c=await pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='15s'");
    const row=(await c.query(`SELECT co.id,co.device_public_key,e.project_id FROM servers s JOIN connectors co ON co.id=s.connector_id AND co.environment_id=s.environment_id
      JOIN environments e ON e.id=s.environment_id WHERE s.id=$1 AND co.status='active' AND co.connector_type='server_inband' AND co.device_public_key IS NOT NULL FOR UPDATE OF co`,[body.serverId])).rows[0];
    if(!row)throw new DeviceError('Registered security reporter required',401);
    const nonce=verifyDeviceRequest(raw,headers,row.device_public_key,Date.now(),'/api/connector/security');
    await c.query("DELETE FROM connector_telemetry_receipts WHERE connector_id=$1 AND received_at<now()-interval '10 minutes'",[row.id]);
    const rate=await c.query("SELECT count(*)::int AS n FROM connector_telemetry_receipts WHERE connector_id=$1 AND received_at>now()-interval '1 minute'",[row.id]);if(rate.rows[0].n>=200)throw new DeviceError('Reporter rate limit exceeded',429);
    const receipt=await c.query('INSERT INTO connector_telemetry_receipts(connector_id,nonce) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING nonce',[row.id,nonce]);if(!receipt.rows.length)throw new DeviceError('Security report replay rejected',409);
    let inserted=0;for(const e of body.events){const saved=await c.query(`INSERT INTO security_events(server_id,device_event_id,event_type,severity,raw_evidence,detected_at)
      VALUES($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT(server_id,device_event_id) WHERE device_event_id IS NOT NULL DO NOTHING RETURNING id`,[body.serverId,e.id,e.type,e.severity,JSON.stringify({summary:ContextBuilder.sanitizeText(e.summary),source:'signed_device_report'}),e.observedAt]);
      if(saved.rows[0]){inserted++;await c.query(`INSERT INTO audit_events(project_id,actor_type,action_name,parameters_hash,diff_summary,status)
        VALUES($1,'system','security.signal.received',$2,'Signed security observation recorded; detector claim requires review','success')`,[row.project_id,digest(saved.rows[0].id)]);}}
    await c.query('COMMIT');return {received:inserted};
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
}
