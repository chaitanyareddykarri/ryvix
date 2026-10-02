import type {Pool,PoolClient} from 'pg';
import {DeviceError,deviceUuid,digest} from './device-protocol';
import {sendNotificationEmail} from '../../../services/src/communication/email-notifications';

export class EmailNotifications {
  constructor(private readonly pool:Pool,private readonly send=sendNotificationEmail){}
  private async tx<T>(fn:(c:PoolClient)=>Promise<T>){const c=await this.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='15s'");const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
  private async audit(c:PoolClient,environment:string,user:string|null,action:string,id:string){await c.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
    SELECT project_id,$2,$3,$4,$5,'Account email notification lifecycle','success' FROM environments WHERE id=$1`,[environment,user,user?'user':'system',action,digest(id)]);}
  async preferences(org:string,user:string){return (await this.pool.query(`SELECT e.id,e.name,p.name AS project_name,coalesce(n.security_enabled,false) AS security_enabled,
    coalesce(n.deployment_enabled,false) AS deployment_enabled,u.email,u.email_confirmed_at IS NOT NULL AS verified
    FROM environments e JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id
    JOIN auth.users u ON u.id=m.user_id LEFT JOIN email_notification_preferences n ON n.environment_id=e.id AND n.user_id=m.user_id
    WHERE p.organization_id=$1 AND m.user_id=$2 ORDER BY e.name LIMIT 100`,[org,user])).rows;}
  async configure(org:string,user:string,environment:string,security:boolean,deployment:boolean){
    if(!deviceUuid.test(environment)||typeof security!=='boolean'||typeof deployment!=='boolean')throw new DeviceError('Environment and notification choices required');
    return this.tx(async c=>{const scope=await c.query(`SELECT e.id FROM environments e JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id
      JOIN auth.users u ON u.id=m.user_id WHERE e.id=$1 AND p.organization_id=$2 AND m.user_id=$3 AND u.email_confirmed_at IS NOT NULL FOR SHARE OF m,u`,[environment,org,user]);
      if(!scope.rows.length)throw new DeviceError('Verified account and environment access required',403);
      await c.query(`INSERT INTO email_notification_preferences(environment_id,user_id,security_enabled,deployment_enabled) VALUES($1,$2,$3,$4)
        ON CONFLICT(environment_id,user_id) DO UPDATE SET security_enabled=$3,deployment_enabled=$4,enabled_at=now()`,[environment,user,security,deployment]);
      await this.audit(c,environment,user,'email.preferences.update',environment);return {saved:true};});
  }
  private sourceSql=`SELECT 'security_event'::text AS kind,s.id AS source_id,h.environment_id,s.detected_at AS event_at,NULL::text AS state,NULL::text AS commit,NULL::text AS environment
    FROM security_events s JOIN servers h ON h.id=s.server_id WHERE s.status<>'dismissed'
    UNION ALL SELECT 'security_incident',i.id,i.environment_id,i.created_at,NULL,NULL,NULL FROM incidents i WHERE i.incident_type='security_attack' AND i.status<>'resolved'
    UNION ALL SELECT 'deployment',d.id,t.environment_id,d.received_at,d.state,d.commit_sha,d.environment
    FROM deployment_events d JOIN deployment_targets t ON t.repository_id=d.repository_id AND t.provider_environment=d.environment
    JOIN release_requests r ON r.target_id=t.id AND r.repository_id=d.repository_id AND r.merge_sha=d.commit_sha
      AND r.status='merged' AND r.target_version=t.updated_at AND d.provider_created_at>=r.created_at
    WHERE d.state IN ('success','failure','error')`;
  async enqueue(){return this.tx(async c=>{const rows=await c.query(`WITH sources AS (${this.sourceSql})
    INSERT INTO email_notification_outbox(environment_id,user_id,kind,source_id)
    SELECT s.environment_id,n.user_id,s.kind,s.source_id FROM sources s JOIN email_notification_preferences n ON n.environment_id=s.environment_id
    JOIN environments e ON e.id=s.environment_id JOIN projects p ON p.id=e.project_id
    JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=n.user_id JOIN auth.users u ON u.id=m.user_id
    WHERE u.email_confirmed_at IS NOT NULL AND s.event_at>=n.enabled_at AND s.event_at>now()-interval '24 hours'
    AND CASE WHEN s.kind='deployment' THEN n.deployment_enabled ELSE n.security_enabled END
    AND NOT EXISTS(SELECT 1 FROM email_notification_outbox o WHERE o.user_id=n.user_id AND o.environment_id=s.environment_id AND o.kind=s.kind AND o.source_id=s.source_id)
    ORDER BY s.event_at LIMIT 500 ON CONFLICT DO NOTHING RETURNING id,environment_id`);
    for(const r of rows.rows)await this.audit(c,r.environment_id,null,'email.enqueue',r.id);return rows.rows.length;});}
  async dispatchOne(){const job=await this.tx(async c=>{
    const candidate=await c.query(`SELECT o.* FROM email_notification_outbox o WHERE o.status='pending'
      AND (SELECT count(*) FROM email_notification_outbox sent WHERE sent.user_id=o.user_id AND sent.claimed_at>now()-interval '1 minute')<3
      ORDER BY o.created_at LIMIT 1 FOR UPDATE OF o SKIP LOCKED`);const r=candidate.rows[0];if(!r)return null;
    const scope=await c.query(`SELECT u.email FROM email_notification_preferences n JOIN environments e ON e.id=n.environment_id JOIN projects p ON p.id=e.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=n.user_id JOIN auth.users u ON u.id=m.user_id
      WHERE n.environment_id=$1 AND n.user_id=$2 AND u.email_confirmed_at IS NOT NULL
      AND CASE WHEN $3='deployment' THEN n.deployment_enabled ELSE n.security_enabled END FOR SHARE OF n,m,u`,[r.environment_id,r.user_id,r.kind]);
    const event=await c.query(`SELECT * FROM (${this.sourceSql}) sources WHERE source_id=$1 AND kind=$2 AND environment_id=$3`,[r.source_id,r.kind,r.environment_id]);
    if(!scope.rows[0]||!event.rows[0]){await c.query("UPDATE email_notification_outbox SET status='cancelled',updated_at=now() WHERE id=$1",[r.id]);await this.audit(c,r.environment_id,null,'email.cancelled',r.id);return null;}
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`email:${r.user_id}`]);
    const rate=await c.query("SELECT count(*)::int AS n FROM email_notification_outbox WHERE user_id=$1 AND claimed_at>now()-interval '1 minute'",[r.user_id]);if(rate.rows[0].n>=3)return null;
    await c.query("UPDATE email_notification_outbox SET status='sending',claimed_at=now(),updated_at=now() WHERE id=$1",[r.id]);await this.audit(c,r.environment_id,null,'email.dispatch',r.id);
    return {...r,to:scope.rows[0].email,event:event.rows[0]};});if(!job)return false;
    let id:string|null=null;try{id=await this.send({id:job.id,to:job.to,kind:job.kind,sourceId:job.source_id,state:job.event.state,commit:job.event.commit,environment:job.event.environment});}catch{}
    await this.tx(async c=>{await c.query("UPDATE email_notification_outbox SET status=$2,provider_id=$3,updated_at=now() WHERE id=$1 AND status='sending'",[job.id,id?'accepted':'unknown',id]);await this.audit(c,job.environment_id,null,id?'email.accepted':'email.unknown',job.id);});return true;
  }
  async expireClaims(){await this.tx(async c=>{const rows=await c.query("UPDATE email_notification_outbox SET status='unknown',updated_at=now() WHERE status='sending' AND claimed_at<now()-interval '1 minute' RETURNING id,environment_id");for(const r of rows.rows)await this.audit(c,r.environment_id,null,'email.unknown',r.id);});}
  async history(org:string,user:string){return (await this.pool.query(`SELECT o.id,o.kind,o.source_id,o.status,o.created_at,o.provider_id FROM email_notification_outbox o
    JOIN environments e ON e.id=o.environment_id JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id
    WHERE p.organization_id=$1 AND m.user_id=$2 AND o.user_id=$2 ORDER BY o.created_at DESC LIMIT 100`,[org,user])).rows;}
}
