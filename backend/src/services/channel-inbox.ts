import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { ContextBuilder } from '../../../ai/src/context/context-builder';
export class ChannelError extends Error {constructor(message:string,readonly status:number){super(message);}}
export class ChannelInbox {
  constructor(private readonly pool:Pool){}
  async receive(connector:string,messageId:string,sender:string,content:string) {
    if(!messageId||messageId.length>512||!sender||sender.length>320||!content.trim()||content.length>10000)throw new ChannelError('Invalid channel message.',400);
    const result=await this.pool.query(`WITH incoming AS (INSERT INTO channel_inbox(connector_id,provider_message_id,sender,content)
      SELECT c.id,$2,$3,$4 FROM connectors c JOIN channel_accounts a ON a.connector_id=c.id JOIN environments e ON e.id=c.environment_id
      JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=a.owner_id
      WHERE c.id=$1 AND c.status='active' AND m.role IN ('owner','admin','developer')
      ON CONFLICT(connector_id,provider_message_id) DO NOTHING RETURNING id,connector_id),
      audited AS (INSERT INTO audit_events(project_id,actor_type,action_name,parameters_hash,diff_summary,status)
        SELECT e.project_id,'system','channel.receive',$5,'Untrusted channel proposal received','success'
        FROM incoming i JOIN connectors c ON c.id=i.connector_id JOIN environments e ON e.id=c.environment_id RETURNING id)
      SELECT id FROM incoming`,
      [connector,messageId,ContextBuilder.sanitizeText(sender),ContextBuilder.sanitizeText(content),createHash('sha256').update(messageId).digest('hex')]);
    return {inserted:result.rows.length>0};
  }
  async list(org:string,user:string) {
    return (await this.pool.query(`SELECT i.id,i.sender,i.content,i.status,i.created_at,c.connector_type,p.id AS project_id,p.name AS project_name
      FROM channel_inbox i JOIN connectors c ON c.id=i.connector_id JOIN environments e ON e.id=c.environment_id
      JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id
      WHERE p.organization_id=$1 AND m.user_id=$2 AND m.role IN ('owner','admin','developer') AND c.status='active'
      ORDER BY i.created_at DESC LIMIT 100`,[org,user])).rows;
  }
  async decide(org:string,user:string,id:string,repository:string|undefined,accept:boolean) {
    const client=await this.pool.connect();try{
      await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='5s'");
      const scope=await client.query(`SELECT i.*,p.id AS project_id,c.connector_type FROM channel_inbox i JOIN connectors c ON c.id=i.connector_id
        JOIN environments e ON e.id=c.environment_id JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id
        WHERE i.id=$1 AND p.organization_id=$2 AND m.user_id=$3 AND m.role IN ('owner','admin','developer') AND c.status='active'
        FOR UPDATE OF i,m,c`,[id,org,user]);
      const item=scope.rows[0];if(!item)throw new ChannelError('Message access denied.',403);
      if(item.status!=='pending')throw new ChannelError('Message already reviewed.',409);
      let taskId=null;
      if(accept){
        const repo=await client.query('SELECT id FROM repositories WHERE id=$1 AND project_id=$2 FOR SHARE',[repository,item.project_id]);
        if(!repo.rows.length)throw new ChannelError('Select a repository in this project.',400);
        const credential=await client.query(`SELECT c.id FROM connectors c JOIN environments e ON e.id=c.environment_id
          JOIN connector_credentials cc ON cc.connector_id=c.id AND cc.credential_type='oauth_token'
          WHERE e.project_id=$1 AND c.connector_type='github' AND c.status='active' AND (cc.expires_at IS NULL OR cc.expires_at>now()) LIMIT 1`,[item.project_id]);
        if(!credential.rows.length)throw new ChannelError('Persisted GitHub connection required.',409);
        await client.query('SELECT id FROM projects WHERE id=$1 FOR UPDATE',[item.project_id]);
        const queue=await client.query(`SELECT count(*)::int AS n FROM repository_jobs j JOIN tasks t ON t.id=j.task_id
          WHERE t.project_id=$1 AND j.status IN ('queued','running')`,[item.project_id]);
        if(queue.rows[0].n>=10)throw new ChannelError('Project queue is full.',429);
        const task=await client.query(`INSERT INTO tasks(project_id,created_by,channel,task_type,status,user_prompt)
          VALUES($1,$2,$3,'coding','queued',$4) RETURNING id`,[item.project_id,user,item.connector_type,item.content]);
        taskId=task.rows[0].id;await client.query('INSERT INTO repository_jobs(task_id,repository_id) VALUES($1,$2)',[taskId,repository]);
      }
      await client.query('UPDATE channel_inbox SET status=$2,task_id=$3 WHERE id=$1',[id,accept?'accepted':'rejected',taskId]);
      await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
        VALUES($1,$2,'user',$3,$4,'Channel task proposal reviewed','success')`,[item.project_id,user,accept?'channel.accept':'channel.reject',createHash('sha256').update(id).digest('hex')]);
      await client.query('COMMIT');return {taskId};
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  }
}
