import {randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {DeviceError,deviceUuid,digest} from './device-protocol';
import {configuredCloudAdapters,type CloudProviderAdapter} from '../../../services/src/connector/cloud-provider.adapters';

type Provider='aws'|'digitalocean'|'hetzner'|'gcp';
export function cloudTarget(server:string,configuration=process.env.RYVIX_CLOUD_TARGETS||'') {
  if(!deviceUuid.test(server))throw new DeviceError('Select a registered server.',400);
  const matches=configuration.split(',').map(s=>s.trim().split(':')).filter(p=>p[0]===server);
  if(matches.length!==1)throw new DeviceError('Server has no unique approved cloud target.',503);
  const [,provider,instance,...rest]=matches[0];
  const valid=provider==='aws'?/^i-[a-f0-9]{8,17}$/.test(instance||''):
    ['digitalocean','hetzner'].includes(provider)?/^[1-9][0-9]*$/.test(instance||''):
    provider==='gcp'&&/^projects\/[a-z][a-z0-9-]+\/zones\/[a-z0-9-]+\/instances\/[a-z][a-z0-9-]*$/.test(instance||'');
  if(!valid||rest.length)throw new DeviceError('Invalid approved cloud target.',503);
  // The same provider resource must never be mapped to multiple registered tenants.
  if(configuration.split(',').filter(s=>s.trim().endsWith(`:${provider}:${instance}`)).length!==1)
    throw new DeviceError('Cloud target must have one registered owner.',503);
  return {provider:provider as Provider,instance};
}
export class CloudRecoveryStore {
  constructor(private readonly pool:Pool,private readonly adapters:Partial<Record<Provider,CloudProviderAdapter>>=configuredCloudAdapters()){}
  private async transaction<T>(fn:(c:PoolClient)=>Promise<T>){const c=await this.pool.connect();try{
    await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='15s'");
    const result=await fn(c);await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
  private async audit(c:PoolClient,p:string,u:string|null,action:string,id:string){await c.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
    VALUES($1,$2,$3,$4,$5,'Cloud recovery lifecycle; acceptance is not recovery proof','success')`,[p,u,u?'user':'system',action,digest(id)]);}
  async request(org:string,user:string,server:string){
    const target=cloudTarget(server);
    return this.transaction(async c=>{
      const scope=await c.query(`SELECT p.id FROM servers s JOIN environments e ON e.id=s.environment_id JOIN projects p ON p.id=e.project_id
        JOIN organization_members m ON m.organization_id=p.organization_id WHERE s.id=$1 AND p.organization_id=$2 AND m.user_id=$3
        AND m.role IN ('owner','admin','developer') FOR UPDATE OF s FOR SHARE OF m`,[server,org,user]);
      if(!scope.rows[0])throw new DeviceError('Cloud recovery access denied.',403);
      const expired=await c.query(`UPDATE cloud_recovery_requests r SET status='expired' FROM approval_requests a WHERE r.approval_id=a.id
        AND r.server_id=$1 AND r.status IN ('pending','approved') AND a.expires_at<=now() RETURNING r.id,r.project_id`,[server]);
      for(const old of expired.rows)await this.audit(c,old.project_id,user,'cloud.recovery.expired',old.id);
      const active=await c.query("SELECT id FROM cloud_recovery_requests WHERE server_id=$1 AND status IN ('pending','approved','dispatching','accepted')",[server]);
      if(active.rows.length)throw new DeviceError('A recovery is already pending. Review its outcome first.',409);
      const id=randomUUID();const a=await c.query(`INSERT INTO approval_requests(organization_id,resource_type,resource_id,title,description,risk_level,expires_at)
        VALUES($1,'recovery_plan',$2,'Cloud instance reboot','One out-of-band reboot of the registered provider target. Independent administrator approval required.','high',now()+interval '10 minutes') RETURNING id`,[org,id]);
      await c.query(`INSERT INTO cloud_recovery_requests(id,server_id,project_id,requested_by,approval_id,provider,instance_id) VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,server,scope.rows[0].id,user,a.rows[0].id,target.provider,target.instance]);
      await this.audit(c,scope.rows[0].id,user,'cloud.recovery.request',id);return {id,status:'pending'};
    });
  }
  async decide(org:string,user:string,id:string,approve:boolean){return this.transaction(async c=>{
    const r=await c.query(`SELECT r.* FROM cloud_recovery_requests r JOIN projects p ON p.id=r.project_id JOIN approval_requests a ON a.id=r.approval_id
      JOIN organization_members m ON m.organization_id=p.organization_id WHERE r.id=$1 AND p.organization_id=$2 AND m.user_id=$3
      AND m.role IN ('owner','admin') AND r.requested_by<>$3 AND r.status='pending' AND a.status='pending' AND a.expires_at>now()
      FOR UPDATE OF r,a FOR SHARE OF m`,[id,org,user]);
    if(!r.rows[0])throw new DeviceError('Independent approval unavailable.',409);
    const status=approve?'approved':'rejected';await c.query('UPDATE approval_requests SET status=$2,decided_by=$3,decided_at=now() WHERE id=$1',[r.rows[0].approval_id,status,user]);
    await c.query('UPDATE cloud_recovery_requests SET status=$2 WHERE id=$1',[id,status]);await this.audit(c,r.rows[0].project_id,user,`cloud.recovery.${status}`,id);return {id,status};
  });}
  async list(org:string,user:string){return (await this.pool.query(`SELECT r.*,s.hostname,a.expires_at FROM cloud_recovery_requests r
    JOIN servers s ON s.id=r.server_id JOIN projects p ON p.id=r.project_id JOIN approval_requests a ON a.id=r.approval_id
    JOIN organization_members m ON m.organization_id=p.organization_id WHERE p.organization_id=$1 AND m.user_id=$2 AND m.role IN ('owner','admin','developer')
    ORDER BY r.created_at DESC LIMIT 100`,[org,user])).rows;}
  async dispatchOne(){
    const job=await this.transaction(async c=>{
      const rows=await c.query(`SELECT r.* FROM cloud_recovery_requests r JOIN approval_requests a ON a.id=r.approval_id
        JOIN projects p ON p.id=r.project_id JOIN servers s ON s.id=r.server_id JOIN environments e ON e.id=s.environment_id AND e.project_id=p.id
        JOIN organization_members requester ON requester.organization_id=p.organization_id AND requester.user_id=r.requested_by
        JOIN organization_members approver ON approver.organization_id=p.organization_id AND approver.user_id=a.decided_by
        WHERE r.status='approved' AND r.provider=ANY($1::text[]) AND a.status='approved' AND a.expires_at>now() AND a.organization_id=p.organization_id
        AND a.resource_id=r.id AND a.resource_type='recovery_plan' AND a.decided_by<>r.requested_by AND requester.role IN ('owner','admin','developer') AND approver.role IN ('owner','admin')
        AND (SELECT count(*) FROM cloud_recovery_requests recent WHERE recent.server_id=r.server_id AND recent.dispatched_at>now()-interval '15 minutes')<3
        AND NOT EXISTS(SELECT 1 FROM cloud_recovery_requests recent WHERE recent.server_id=r.server_id AND recent.dispatched_at>now()-interval '60 seconds')
        AND ((SELECT count(*) FROM cloud_recovery_requests recent WHERE recent.server_id=r.server_id AND recent.dispatched_at>now()-interval '15 minutes')<2
          OR NOT EXISTS(SELECT 1 FROM cloud_recovery_requests recent WHERE recent.server_id=r.server_id AND recent.dispatched_at>now()-interval '300 seconds'))
        ORDER BY r.created_at LIMIT 1 FOR UPDATE OF r,s SKIP LOCKED FOR SHARE OF a,requester,approver`,[Object.keys(this.adapters)]);
      const r=rows.rows[0];if(!r)return null;
      let matches=false;
      try{const target=cloudTarget(r.server_id);matches=target.provider===r.provider&&target.instance===r.instance_id;}catch{}
      if(!matches){await c.query("UPDATE cloud_recovery_requests SET status='expired' WHERE id=$1",[r.id]);
        await this.audit(c,r.project_id,null,'cloud.recovery.target_invalidated',r.id);return null;}
      const recent=await c.query(`SELECT count(*)::int AS n,extract(epoch FROM now()-max(dispatched_at)) AS age FROM cloud_recovery_requests
        WHERE server_id=$1 AND dispatched_at>now()-interval '15 minutes'`,[r.server_id]);
      const {n,age}=recent.rows[0];if(n>=3||n>0&&Number(age)<(n===1?60:300))return null;
      await c.query("UPDATE cloud_recovery_requests SET status='dispatching',dispatched_at=now() WHERE id=$1",[r.id]);
      await this.audit(c,r.project_id,null,'cloud.recovery.dispatch',r.id);return r;
    });
    if(!job)return false;
    let status='unknown',actionId:string|null=null;
    try{const result=await this.adapters[job.provider as Provider]!.execute(job.instance_id,'reboot');
      if(result.id&&['completed','dispatched'].includes(result.status)){status='accepted';actionId=result.id;}
    }catch{/* An uncertain mutation must never be automatically retried. */}
    await this.transaction(async c=>{await c.query("UPDATE cloud_recovery_requests SET status=$2,provider_action_id=$3 WHERE id=$1 AND status='dispatching'",[job.id,status,actionId]);
      await this.audit(c,job.project_id,null,`cloud.recovery.${status}`,job.id);});return true;
  }
  async verifyPending(){
    const rows=await this.pool.query("SELECT * FROM cloud_recovery_requests WHERE status IN ('dispatching','accepted') ORDER BY dispatched_at LIMIT 10");
    await Promise.all(rows.rows.map(async r=>{
      let observation:unknown={reason:'Verification unavailable'},healthy=false;
      try{const target=cloudTarget(r.server_id);if(target.provider!==r.provider||target.instance!==r.instance_id)throw new Error('Target changed');
        const probe=await this.adapters[target.provider]!.probe(target.instance);
        const heartbeat=await this.pool.query(`SELECT c.last_heartbeat_at FROM servers s JOIN connectors c ON c.id=s.connector_id AND c.environment_id=s.environment_id
          JOIN environments e ON e.id=s.environment_id WHERE s.id=$1 AND e.project_id=$3 AND c.connector_type='server_inband'
          AND c.status='active' AND c.device_public_key IS NOT NULL AND c.last_heartbeat_at>$2 AND c.last_heartbeat_at>now()-interval '90 seconds'`,[r.server_id,r.dispatched_at,r.project_id]);
        healthy=r.status==='accepted'&&probe.state==='running'&&heartbeat.rows.length>0;
        observation={probe,freshSignedAgentHeartbeat:heartbeat.rows.length>0,rebootProven:false};
      }catch{}
      if(!healthy&&Date.now()-new Date(r.dispatched_at).getTime()<180000)return;
      await this.transaction(async c=>{const changed=await c.query(`UPDATE cloud_recovery_requests SET status=$2,observed_at=now(),observation=$3::jsonb
        WHERE id=$1 AND status=$4 RETURNING id`,[r.id,healthy?'observed_healthy':'unknown',JSON.stringify(observation),r.status]);
        if(changed.rows.length)await this.audit(c,r.project_id,null,'cloud.recovery.observe',r.id);});
    }));
  }
}
