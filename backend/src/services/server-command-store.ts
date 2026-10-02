import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { DeviceError, deviceUuid, digest, verifyDeviceRequest } from './device-protocol';
import { allowedService, signCommand } from './command-protocol';

export class ServerCommandStore {
  constructor(private readonly pool:Pool){}
  private async transaction<T>(fn:(client:PoolClient)=>Promise<T>) {
    const client=await this.pool.connect();
    try{await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='5s'");await client.query("SET LOCAL statement_timeout='15s'");
      const result=await fn(client);await client.query('COMMIT');return result;
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  }
  private async audit(client:PoolClient,project:string,user:string|null,action:string,id:string){
    await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
      VALUES($1,$2,$3,$4,$5,'Approved device command lifecycle','success')`,[project,user,user?'user':'system',action,digest(id)]);
  }
  async request(org:string,user:string,server:string,service:unknown){
    if(!deviceUuid.test(server)||!allowedService(service))throw new DeviceError('Select a server and explicitly allowed service.',400);
    if(!process.env.RYVIX_COMMAND_PRIVATE_KEY)throw new DeviceError('Command signing is not configured.',503);
    return this.transaction(async client=>{
      const scope=await client.query(`SELECT p.id FROM servers s JOIN connectors c ON c.id=s.connector_id AND c.environment_id=s.environment_id
        JOIN environments e ON e.id=s.environment_id JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id
        WHERE s.id=$1 AND p.organization_id=$2 AND m.user_id=$3 AND m.role IN ('owner','admin','developer')
        AND c.status='active' AND c.connector_type='server_inband' AND c.device_public_key IS NOT NULL FOR UPDATE OF c FOR SHARE OF m`,[server,org,user]);
      if(!scope.rows[0])throw new DeviceError('Server operation access denied.',403);
      const count=await client.query("SELECT count(*)::int AS n FROM server_commands WHERE server_id=$1 AND status IN ('pending','approved') AND created_at>now()-interval '10 minutes'",[server]);
      if(count.rows[0].n>=10)throw new DeviceError('Too many pending server approvals.',429);
      const id=randomUUID();
      const approval=await client.query(`INSERT INTO approval_requests(organization_id,resource_type,resource_id,title,description,risk_level,expires_at)
        VALUES($1,'server_command',$2,$3,'One restart on the selected server; a different owner or administrator must approve.','high',now()+interval '10 minutes') RETURNING id`,[org,id,`Restart ${service}`]);
      await client.query(`INSERT INTO server_commands(id,server_id,project_id,requested_by,approval_id,action,service)
        VALUES($1,$2,$3,$4,$5,'restart_service',$6)`,[id,server,scope.rows[0].id,user,approval.rows[0].id,service]);
      await this.audit(client,scope.rows[0].id,user,'server.command.request',id);
      return {id,approvalId:approval.rows[0].id,status:'pending'};
    });
  }
  async decide(org:string,user:string,id:string,approve:boolean){
    return this.transaction(async client=>{
      const selected=await client.query(`SELECT c.id,c.project_id,c.approval_id FROM server_commands c JOIN projects p ON p.id=c.project_id
        JOIN approval_requests a ON a.id=c.approval_id JOIN organization_members m ON m.organization_id=p.organization_id
        WHERE c.id=$1 AND p.organization_id=$2 AND m.user_id=$3 AND m.role IN ('owner','admin') AND c.requested_by<>$3
        AND c.status='pending' AND a.status='pending' AND a.expires_at>now() FOR UPDATE OF c,a FOR SHARE OF m`,[id,org,user]);
      const command=selected.rows[0];if(!command)throw new DeviceError('Pending command unavailable or independent approver required.',409);
      await client.query('UPDATE approval_requests SET status=$2,decided_by=$3,decided_at=now() WHERE id=$1',[command.approval_id,approve?'approved':'rejected',user]);
      await client.query('UPDATE server_commands SET status=$2 WHERE id=$1',[id,approve?'approved':'rejected']);
      await this.audit(client,command.project_id,user,approve?'server.command.approve':'server.command.reject',id);
      return {id,status:approve?'approved':'rejected'};
    });
  }
  async list(org:string,user:string){
    return (await this.pool.query(`SELECT c.id,c.server_id,s.hostname,c.service,c.status,c.requested_by,c.created_at,c.delivered_at,c.completed_at,c.result,
      a.expires_at,a.decided_by FROM server_commands c JOIN servers s ON s.id=c.server_id JOIN projects p ON p.id=c.project_id
      JOIN approval_requests a ON a.id=c.approval_id JOIN organization_members m ON m.organization_id=p.organization_id
      WHERE p.organization_id=$1 AND m.user_id=$2 AND m.role IN ('owner','admin','developer') ORDER BY c.created_at DESC LIMIT 100`,[org,user])).rows;
  }
  async device(body:Buffer,headers:Headers,path:'/api/connector/commands/poll'|'/api/connector/commands/result'){
    let input:any;try{input=JSON.parse(body.toString('utf8'));}catch{throw new DeviceError('Invalid command request.');}
    if(!deviceUuid.test(input?.serverId||''))throw new DeviceError('Server identity required.');
    return this.transaction(async client=>{
      const registered=await client.query(`SELECT c.id,c.device_public_key,p.id AS project_id,p.organization_id FROM connectors c JOIN servers s ON s.connector_id=c.id
        AND s.environment_id=c.environment_id JOIN environments e ON e.id=s.environment_id JOIN projects p ON p.id=e.project_id
        WHERE s.id=$1 AND c.status='active' AND c.connector_type='server_inband' AND c.device_public_key IS NOT NULL FOR UPDATE OF c`,[input.serverId]);
      const device=registered.rows[0];if(!device)throw new DeviceError('Device unavailable.',401);
      const nonce=verifyDeviceRequest(body,headers,device.device_public_key,Date.now(),path);
      await client.query("DELETE FROM connector_telemetry_receipts WHERE connector_id=$1 AND received_at<now()-interval '10 minutes'",[device.id]);
      const rate=await client.query("SELECT count(*)::int AS n FROM connector_telemetry_receipts WHERE connector_id=$1 AND received_at>now()-interval '1 minute'",[device.id]);
      if(rate.rows[0].n>=200)throw new DeviceError('Device request limit reached.',429);
      const receipt=await client.query('INSERT INTO connector_telemetry_receipts(connector_id,nonce) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING nonce',[device.id,nonce]);
      if(!receipt.rows.length)throw new DeviceError('Device request replay rejected.',409);
      if(path.endsWith('/result')){
        if(!deviceUuid.test(input.commandId||'')||!['succeeded','failed','unknown'].includes(input.status)||
          !['active','inactive','unknown'].includes(input.serviceState)||(input.status==='succeeded'&&input.serviceState!=='active'))throw new DeviceError('Invalid execution receipt.');
        const result={status:input.status,serviceState:input.serviceState};
        const selected=await client.query('SELECT * FROM server_commands WHERE id=$1 AND server_id=$2 FOR UPDATE',[input.commandId,input.serverId]);
        const command=selected.rows[0];if(!command||!command.delivered_at)throw new DeviceError('Command was not delivered.',409);
        if(command.result){
          if(command.result.status!==result.status||command.result.serviceState!==result.serviceState)throw new DeviceError('Conflicting execution receipt.',409);
          return {acknowledged:true};
        }
        if(command.status!=='delivered')throw new DeviceError('Command receipt unavailable.',409);
        await client.query('UPDATE server_commands SET status=$2,result=$3::jsonb,completed_at=now() WHERE id=$1',[command.id,result.status,JSON.stringify(result)]);
        await this.audit(client,device.project_id,null,`server.command.${result.status}`,command.id);
        return {acknowledged:true};
      }
      // Redelivery is safe only because the device persists acceptance before executing.
      const candidate=await client.query(`SELECT c.*,a.decided_by FROM server_commands c JOIN approval_requests a ON a.id=c.approval_id
        JOIN organization_members requester ON requester.organization_id=$2 AND requester.user_id=c.requested_by
        JOIN organization_members approver ON approver.organization_id=$2 AND approver.user_id=a.decided_by
        WHERE c.server_id=$1 AND c.project_id=$3 AND c.status IN ('approved','delivered') AND a.status='approved'
        AND a.resource_id=c.id AND a.resource_type='server_command' AND a.organization_id=$2 AND a.expires_at>now()
        AND requester.role IN ('owner','admin','developer') AND approver.role IN ('owner','admin') AND c.requested_by<>a.decided_by
        AND (c.command_expires_at IS NULL OR c.command_expires_at>now())
        ORDER BY c.created_at FOR UPDATE OF c,a FOR SHARE OF requester,approver LIMIT 1`,[input.serverId,device.organization_id,device.project_id]);
      const command=candidate.rows[0];if(!command||!allowedService(command.service))return {command:null};
      if(command.envelope)return {command:command.envelope};
      const prior=await client.query(`SELECT status,extract(epoch FROM(now()-delivered_at)) AS age FROM server_commands
        WHERE server_id=$1 AND service=$2 AND delivered_at>now()-interval '15 minutes' ORDER BY delivered_at DESC`,[input.serverId,command.service]);
      if(prior.rows.length>=3||prior.rows.some(r=>r.status==='delivered'||r.status==='unknown')||
        (prior.rows.length && Number(prior.rows[0].age)<(prior.rows.length===1?60:300)))return {command:null};
      const now=Date.now();
      const envelope=signCommand({version:1,id:command.id,serverId:input.serverId,approvalId:command.approval_id,action:'restart_service',service:command.service,issuedAt:now,expiresAt:now+120000});
      await client.query("UPDATE server_commands SET status='delivered',envelope=$2::jsonb,delivered_at=now(),command_expires_at=$3 WHERE id=$1",[command.id,JSON.stringify(envelope),new Date(now+120000)]);
      await this.audit(client,device.project_id,null,'server.command.deliver',command.id);
      return {command:envelope};
    });
  }
}
