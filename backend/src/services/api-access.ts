import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
export class ApiAccessError extends Error{constructor(message:string,readonly status:number){super(message);}}
/** Versioned read-only API. Session/approval endpoints never accept these keys. */
export async function readApiServers(pool:Pool,authorization:string|null){
 if(!authorization||!/^Bearer ryvix_live_[a-f0-9]{48}$/.test(authorization))throw new ApiAccessError('Valid bearer API key required.',401);
 const digest=createHash('sha256').update(authorization.slice(7)).digest('hex'),c=await pool.connect();
 try{
  await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='10s'");await c.query("SET LOCAL lock_timeout='3s'");
  const key=(await c.query(`SELECT id,organization_id,scopes FROM api_keys WHERE hashed_secret=$1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now()) FOR UPDATE`,[digest])).rows[0];
  if(!key)throw new ApiAccessError('API key invalid, expired or revoked.',401);
  if(!Array.isArray(key.scopes)||!key.scopes.includes('read'))throw new ApiAccessError('Read scope required.',403);
  const budget=await c.query(`INSERT INTO chat_request_budgets(organization_id,subject,bucket,requests) VALUES($1,$2,date_trunc('minute',now()),1)
   ON CONFLICT(organization_id,subject,bucket) DO UPDATE SET requests=chat_request_budgets.requests+1 WHERE chat_request_budgets.requests<60 RETURNING requests`,[key.organization_id,`api-key:${key.id}`]);
  if(!budget.rows.length)throw new ApiAccessError('API rate limit exceeded.',429);
  const servers=(await c.query(`SELECT s.id,s.hostname,s.os_type,s.cloud_provider FROM servers s JOIN environments e ON e.id=s.environment_id JOIN projects p ON p.id=e.project_id WHERE p.organization_id=$1 ORDER BY s.id LIMIT 100`,[key.organization_id])).rows;
  await c.query('UPDATE api_keys SET last_used_at=now() WHERE id=$1',[key.id]);
  await c.query("INSERT INTO organization_audit_events(organization_id,actor_id,action_name,parameters_hash) VALUES($1,NULL,'api.servers.read',$2)",[key.organization_id,createHash('sha256').update(key.id).digest('hex')]);
  await c.query('COMMIT');return {servers,limit:100};
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
}
