import type {Pool,PoolClient} from 'pg';
import {digest,deviceUuid} from './device-protocol';
import {sendIncidentNotification,type IncidentTransport} from '../../../services/src/communication/incident-transports';

type Target={id:string;environmentId:string;ownerId:string;provider:IncidentTransport;destination:string;vaultSecretRef:string;optedIn:true};
export function incidentTargets(raw=process.env.RYVIX_INCIDENT_NOTIFICATION_TARGETS||'[]'):Target[]{
  const values=JSON.parse(raw);if(!Array.isArray(values)||values.length>100)throw new Error('Invalid notification targets');
  const targets=values.map(t=>{
    if(!t||![t.id,t.environmentId,t.ownerId,t.vaultSecretRef].every(v=>typeof v==='string'&&deviceUuid.test(v))||t.optedIn!==true||
      !['slack','pagerduty','twilio'].includes(t.provider)||typeof t.destination!=='string'||
      (t.provider==='slack'&&!/^[CGD][A-Z0-9]{8,30}$/.test(t.destination))||
      (t.provider==='twilio'&&!/^\+[1-9]\d{6,14}$/.test(t.destination))||
      (t.provider==='pagerduty'&&t.destination!=='integration'))throw new Error('Explicit opted-in notification target required');
    return {id:t.id,environmentId:t.environmentId,ownerId:t.ownerId,provider:t.provider,destination:t.destination,vaultSecretRef:t.vaultSecretRef,optedIn:true} as Target;
  });
  if(new Set(targets.map(t=>t.id)).size!==targets.length)throw new Error('Duplicate target identity');return targets;
}
const fingerprint=(t:Target)=>digest(JSON.stringify(t));
export class IncidentNotifications{
  constructor(private readonly pool:Pool,private readonly send=sendIncidentNotification){}
  private async transaction<T>(fn:(c:PoolClient)=>Promise<T>){const c=await this.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='15s'");const value=await fn(c);await c.query('COMMIT');return value;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
  private async audit(c:PoolClient,project:string,action:string,id:string){await c.query(`INSERT INTO audit_events(project_id,actor_type,action_name,parameters_hash,diff_summary,status)
    VALUES($1,'system',$2,$3,'Configured P1 notification lifecycle','success')`,[project,action,digest(id)]);}
  async enqueue(){for(const t of incidentTargets())await this.transaction(async c=>{
    const rows=await c.query(`INSERT INTO incident_notification_outbox(project_id,incident_id,target_id,target_hash,provider)
      SELECT e.project_id,i.id,$2,$3,$4 FROM incidents i JOIN environments e ON e.id=i.environment_id
      JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$5
      WHERE e.id=$1 AND m.role IN ('owner','admin') AND i.severity='P1_critical' AND i.status<>'resolved'
      AND i.created_at>now()-interval '24 hours' ORDER BY i.created_at LIMIT 100 ON CONFLICT(incident_id,target_id) DO NOTHING RETURNING id,project_id`,
      [t.environmentId,t.id,fingerprint(t),t.provider,t.ownerId]);
    for(const r of rows.rows)await this.audit(c,r.project_id,'incident.notification.enqueue',r.id);
  });}
  async dispatchOne(){const targets=incidentTargets();const job=await this.transaction(async c=>{
    const row=(await c.query("SELECT * FROM incident_notification_outbox WHERE status='pending' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED")).rows[0];if(!row)return null;
    const target=targets.find(t=>t.id===row.target_id&&fingerprint(t)===row.target_hash);
    const scope=target?(await c.query(`SELECT v.decrypted_secret FROM incidents i JOIN environments e ON e.id=i.environment_id
      JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$4
      JOIN vault.decrypted_secrets v ON v.id=$5 WHERE i.id=$1 AND e.id=$2 AND p.id=$3 AND m.role IN ('owner','admin')
      AND i.severity='P1_critical' AND i.status<>'resolved' AND i.created_at>now()-interval '24 hours' FOR SHARE OF i,m,e,p`,
      [row.incident_id,target.environmentId,row.project_id,target.ownerId,target.vaultSecretRef])).rows[0]:null;
    if(!target||!scope){await c.query("UPDATE incident_notification_outbox SET status='cancelled',updated_at=now() WHERE id=$1",[row.id]);await this.audit(c,row.project_id,'incident.notification.cancelled',row.id);return null;}
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`incident-notification:${target.id}`]);
    const count=(await c.query("SELECT count(*)::int AS n FROM incident_notification_outbox WHERE target_id=$1 AND claimed_at>now()-interval '1 minute'",[target.id])).rows[0].n;
    if(count>=3)return null;
    await c.query("UPDATE incident_notification_outbox SET status='sending',claimed_at=now(),updated_at=now() WHERE id=$1",[row.id]);
    await this.audit(c,row.project_id,'incident.notification.dispatch',row.id);
    return {...row,destination:target.destination,secret:scope.decrypted_secret};
  });if(!job)return false;
    let id:string|null=null;try{id=await this.send({id:job.id,incident:job.incident_id,provider:job.provider,destination:job.destination,secret:job.secret});}catch{}
    await this.transaction(async c=>{await c.query("UPDATE incident_notification_outbox SET status=$2,provider_message_id=$3,updated_at=now() WHERE id=$1 AND status='sending'",[job.id,id?'accepted':'unknown',id]);await this.audit(c,job.project_id,id?'incident.notification.accepted':'incident.notification.unknown',job.id);});return true;
  }
  async expireClaims(){await this.transaction(async c=>{const rows=await c.query("UPDATE incident_notification_outbox SET status='unknown',updated_at=now() WHERE status='sending' AND claimed_at<now()-interval '2 minutes' RETURNING id,project_id");for(const r of rows.rows)await this.audit(c,r.project_id,'incident.notification.unknown',r.id);});}
  async list(org:string,user:string){return (await this.pool.query(`SELECT o.id,o.incident_id,o.provider,o.status,o.created_at,o.updated_at FROM incident_notification_outbox o
    JOIN projects p ON p.id=o.project_id JOIN organization_members m ON m.organization_id=p.organization_id
    WHERE p.organization_id=$1 AND m.user_id=$2 AND m.role IN ('owner','admin') ORDER BY o.created_at DESC LIMIT 100`,[org,user])).rows;}
}
