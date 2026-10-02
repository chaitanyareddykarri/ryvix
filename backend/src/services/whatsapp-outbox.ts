import type {Pool,PoolClient} from 'pg';
import {digest,deviceUuid} from './device-protocol';
import {sendWhatsAppTemplate} from '../../../services/src/communication/whatsapp';
type Target={connectorId:string;recipient:string;template:string;language:string;optedIn:boolean};
export function alertTargets(configuration=process.env.RYVIX_WHATSAPP_ALERT_TARGETS||'[]'):Target[]{
  const targets=JSON.parse(configuration);if(!Array.isArray(targets)||targets.length>100)throw new Error('Invalid alert target list');
  for(const t of targets)if(!deviceUuid.test(t.connectorId||'')||!/^\d{5,20}$/.test(t.recipient||'')||! /^[a-z0-9_]{1,128}$/.test(t.template||'')||! /^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(t.language||'')||t.optedIn!==true)throw new Error('Opted-in alert targets required');
  if(new Set(targets.map(t=>`${t.connectorId}:${t.recipient}`)).size!==targets.length)throw new Error('Duplicate alert target');return targets;
}
export class WhatsAppOutbox {
  constructor(private readonly pool:Pool,private readonly send=sendWhatsAppTemplate){}
  private async transaction<T>(fn:(c:PoolClient)=>Promise<T>){const c=await this.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='15s'");
    const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
  private async audit(c:PoolClient,project:string,action:string,id:string){await c.query(`INSERT INTO audit_events(project_id,actor_type,action_name,parameters_hash,diff_summary,status)
    VALUES($1,'system',$2,$3,'P1 WhatsApp notification lifecycle','success')`,[project,action,digest(id)]);}
  async enqueue(){for(const t of alertTargets())await this.transaction(async c=>{
    const rows=await c.query(`INSERT INTO whatsapp_alert_outbox(project_id,incident_id,connector_id,recipient,template,language)
      SELECT e.project_id,i.id,c.id,$2,$3,$4 FROM incidents i JOIN connectors c ON c.environment_id=i.environment_id
      JOIN environments e ON e.id=i.environment_id JOIN channel_accounts a ON a.connector_id=c.id
      JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=a.owner_id
      WHERE c.id=$1 AND c.status='active' AND c.connector_type='whatsapp' AND m.role IN ('owner','admin')
      AND i.severity='P1_critical' AND i.status<>'resolved' AND i.created_at>now()-interval '24 hours'
      ORDER BY i.created_at LIMIT 100 ON CONFLICT(incident_id,connector_id,recipient) DO NOTHING RETURNING id,project_id`,[t.connectorId,t.recipient,t.template,t.language]);
    for(const r of rows.rows)await this.audit(c,r.project_id,'whatsapp.alert.enqueue',r.id);
  });}
  async dispatchOne(){const targets=alertTargets();const job=await this.transaction(async c=>{
    const selected=await c.query("SELECT * FROM whatsapp_alert_outbox WHERE status='pending' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED");
    const r=selected.rows[0];if(!r)return null;
    const target=targets.find(t=>t.connectorId===r.connector_id&&t.recipient===r.recipient&&t.template===r.template&&t.language===r.language);
    const scope=await c.query(`SELECT a.provider_subject,v.decrypted_secret FROM connectors c JOIN channel_accounts a ON a.connector_id=c.id
      JOIN environments e ON e.id=c.environment_id JOIN projects p ON p.id=e.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=a.owner_id
      JOIN incidents i ON i.id=$2 AND i.environment_id=e.id JOIN connector_credentials cc ON cc.connector_id=c.id AND cc.credential_type='oauth_token'
      JOIN vault.decrypted_secrets v ON v.id::text=cc.vault_secret_ref
      WHERE c.id=$1 AND p.id=$3 AND c.connector_type='whatsapp' AND c.status='active' AND m.role IN ('owner','admin')
      AND i.severity='P1_critical' AND i.status<>'resolved' AND i.created_at>now()-interval '24 hours'
      AND (cc.expires_at IS NULL OR cc.expires_at>now()) FOR SHARE OF c,m,i,cc`,[r.connector_id,r.incident_id,r.project_id]);
    if(!target||!scope.rows[0]){await c.query("UPDATE whatsapp_alert_outbox SET status='cancelled',updated_at=now() WHERE id=$1",[r.id]);await this.audit(c,r.project_id,'whatsapp.alert.cancelled',r.id);return null;}
    const version=process.env.WHATSAPP_GRAPH_VERSION||'';if(!/^v\d+\.\d+$/.test(version))throw new Error('WhatsApp Graph version required');
    // Serialize recipient rate checks across worker processes.
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`whatsapp:${r.connector_id}:${r.recipient}`]);
    const count=await c.query("SELECT count(*)::int AS n FROM whatsapp_alert_outbox WHERE connector_id=$1 AND recipient=$2 AND claimed_at>now()-interval '1 minute'",[r.connector_id,r.recipient]);
    if(count.rows[0].n>=3)return null;
    await c.query("UPDATE whatsapp_alert_outbox SET status='sending',claimed_at=now(),updated_at=now() WHERE id=$1",[r.id]);await this.audit(c,r.project_id,'whatsapp.alert.dispatch',r.id);
    return {...r,phone:scope.rows[0].provider_subject.slice('whatsapp:'.length),token:scope.rows[0].decrypted_secret,version};
  });if(!job)return false;
    let message:string|null=null;try{message=await this.send({phone:job.phone,token:job.token,version:job.version,recipient:job.recipient,template:job.template,language:job.language,incident:job.incident_id});}catch{}
    await this.transaction(async c=>{await c.query("UPDATE whatsapp_alert_outbox SET status=$2,provider_message_id=$3,updated_at=now() WHERE id=$1 AND status='sending'",[job.id,message?'accepted':'unknown',message]);
      await this.audit(c,job.project_id,message?'whatsapp.alert.accepted':'whatsapp.alert.unknown',job.id);});
    await this.reconcileReceipts();return true;
  }
  async expireClaims(){await this.transaction(async c=>{const rows=await c.query("UPDATE whatsapp_alert_outbox SET status='unknown',updated_at=now() WHERE status='sending' AND claimed_at<now()-interval '1 minute' RETURNING id,project_id");
    for(const r of rows.rows)await this.audit(c,r.project_id,'whatsapp.alert.unknown',r.id);});}
  async receipt(event:{phone:string;recipient:string;id:string;status:string}){return this.transaction(async c=>{
    const ranks:Record<string,number>={accepted:0,sent:1,failed:2,delivered:3,read:4};
    if(!['sent','delivered','read','failed'].includes(event.status))return;
    const received=await c.query(`INSERT INTO whatsapp_alert_receipts(connector_id,message_id,recipient,status)
      SELECT a.connector_id,$2,$3,$4 FROM channel_accounts a JOIN connectors co ON co.id=a.connector_id
      WHERE a.provider_subject=$1 AND co.connector_type='whatsapp' AND co.status='active'
      ON CONFLICT DO NOTHING RETURNING connector_id`,[`whatsapp:${event.phone}`,event.id,event.recipient,event.status]);
    if(received.rows[0]){const project=await c.query('SELECT e.project_id FROM connectors co JOIN environments e ON e.id=co.environment_id WHERE co.id=$1',[received.rows[0].connector_id]);
      await this.audit(c,project.rows[0].project_id,'whatsapp.alert.receipt',event.id);}
    const rows=await c.query(`SELECT o.* FROM whatsapp_alert_outbox o JOIN channel_accounts a ON a.connector_id=o.connector_id
      WHERE o.provider_message_id=$1 AND a.provider_subject=$2 AND o.recipient=$3 FOR UPDATE OF o`,[event.id,`whatsapp:${event.phone}`,event.recipient]);
    const r=rows.rows[0];if(!r||!(r.status in ranks)||ranks[event.status]<=ranks[r.status])return;
    await c.query('UPDATE whatsapp_alert_outbox SET status=$2,updated_at=now() WHERE id=$1',[r.id,event.status]);await this.audit(c,r.project_id,`whatsapp.alert.${event.status}`,r.id);
  });}
  async reconcileReceipts(){
    const rows=await this.pool.query(`SELECT a.provider_subject,r.message_id,r.recipient,r.status FROM whatsapp_alert_receipts r
      JOIN whatsapp_alert_outbox o ON o.connector_id=r.connector_id AND o.provider_message_id=r.message_id AND o.recipient=r.recipient
      JOIN channel_accounts a ON a.connector_id=r.connector_id
      WHERE o.status IN ('accepted','sent','failed','delivered') AND r.received_at>now()-interval '7 days'
      ORDER BY r.received_at DESC LIMIT 1000`);
    for(const r of rows.rows)await this.receipt({phone:r.provider_subject.slice('whatsapp:'.length),id:r.message_id,recipient:r.recipient,status:r.status});
    await this.pool.query("DELETE FROM whatsapp_alert_receipts WHERE received_at<now()-interval '7 days'");
  }
  async list(org:string,user:string){return (await this.pool.query(`SELECT o.id,o.incident_id,o.status,o.created_at,o.updated_at,o.provider_message_id
    FROM whatsapp_alert_outbox o JOIN projects p ON p.id=o.project_id JOIN organization_members m ON m.organization_id=p.organization_id
    WHERE p.organization_id=$1 AND m.user_id=$2 AND m.role IN ('owner','admin') ORDER BY o.created_at DESC LIMIT 100`,[org,user])).rows;}
}
