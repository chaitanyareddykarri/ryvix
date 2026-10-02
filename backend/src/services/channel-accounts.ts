import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import {ChannelError} from './channel-inbox';

export async function channelProviderJson(url:string,init:RequestInit={},max=2000000) {
  const response=await fetch(url,{...init,redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(10000),...(init.signal?[init.signal]:[])])});
  if(!response.ok||!response.body){await response.body?.cancel();throw new ChannelError('Channel provider request failed. Reconnect or retry.',502);}
  const reader=response.body.getReader();let bytes=0,text='';const decoder=new TextDecoder();
  try{while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.length;if(bytes>max)throw new ChannelError('Provider response too large.',502);text+=decoder.decode(next.value,{stream:true});}
    return JSON.parse(text+decoder.decode());
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export class ChannelAccounts {
  constructor(private readonly pool:Pool){}
  async connect(org:string,user:string,environment:string,channel:'gmail'|'whatsapp',subject:string,secret:string,cursor?:string) {
    const client=await this.pool.connect();try{
      await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='5s'");
      const scope=await client.query(`SELECT p.id FROM environments e JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id
        WHERE e.id=$1 AND p.organization_id=$2 AND m.user_id=$3 AND m.role IN ('owner','admin') FOR UPDATE OF m`,[environment,org,user]);
      if(!scope.rows.length)throw new ChannelError('Channel administration denied.',403);
      // Serialize connections to one provider identity, including first connection.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${channel}:${subject}`]);
      const existing=await client.query(`SELECT a.connector_id,c.environment_id FROM channel_accounts a
        JOIN connectors c ON c.id=a.connector_id WHERE a.provider_subject=$1 FOR UPDATE OF a,c`,[`${channel}:${subject}`]);
      if(existing.rows[0] && existing.rows[0].environment_id!==environment)
        throw new ChannelError('Channel account is already bound to another environment.',409);
      let id=existing.rows[0]?.connector_id;
      if(id){
        const refs=await client.query('SELECT vault_secret_ref FROM connector_credentials WHERE connector_id=$1',[id]);
        await client.query('DELETE FROM connector_credentials WHERE connector_id=$1',[id]);
        for(const ref of refs.rows)await client.query('DELETE FROM vault.secrets WHERE id=$1',[ref.vault_secret_ref]);
        await client.query("UPDATE connectors SET status='active',updated_at=now() WHERE id=$1",[id]);
      }else{
        const connector=await client.query(`INSERT INTO connectors(environment_id,name,connector_type,status) VALUES($1,$2,$3,'active') RETURNING id`,[environment,`${channel} inbox`,channel]);
        id=connector.rows[0].id;
      }
      const vault=await client.query('SELECT vault.create_secret($1,$2) AS id',[secret,`channel-${id}`]);
      await client.query("INSERT INTO connector_credentials(connector_id,credential_type,vault_secret_ref) VALUES($1,'oauth_token',$2)",[id,vault.rows[0].id]);
      await client.query(`INSERT INTO channel_accounts(connector_id,owner_id,provider_subject,cursor) VALUES($1,$2,$3,$4)
        ON CONFLICT(connector_id) DO UPDATE SET owner_id=excluded.owner_id,cursor=excluded.cursor`,[id,user,`${channel}:${subject}`,cursor||null]);
      await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
        VALUES($1,$2,'user','channel.connect',$3,'Verified channel account connected','success')`,[scope.rows[0].id,user,createHash('sha256').update(id).digest('hex')]);
      await client.query('COMMIT');return {connectorId:id};
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  }
  async credential(org:string,user:string,id:string) {
    const result=await this.pool.query(`SELECT a.*,c.connector_type,s.decrypted_secret FROM channel_accounts a JOIN connectors c ON c.id=a.connector_id
      JOIN environments e ON e.id=c.environment_id JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id
      JOIN connector_credentials cc ON cc.connector_id=c.id AND cc.credential_type='oauth_token' JOIN vault.decrypted_secrets s ON s.id::text=cc.vault_secret_ref
      WHERE c.id=$1 AND p.organization_id=$2 AND m.user_id=$3 AND a.owner_id=$3 AND m.role IN ('owner','admin') AND c.status='active'
        AND (cc.expires_at IS NULL OR cc.expires_at>now())`,[id,org,user]);
    if(!result.rows.length)throw new ChannelError('Channel account unavailable.',403);return result.rows[0];
  }
}
