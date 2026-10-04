import type {Pool} from 'pg';
import {ChannelAccounts,channelProviderJson} from '../services/channel-accounts';
import {ChannelError} from '../services/channel-inbox';
import {createHash} from 'node:crypto';
export async function gmailAccess(pool:Pool,org:string,user:string,id:string,send=false){
  const account=await new ChannelAccounts(pool).credential(org,user,id);
  if(account.connector_type!=='gmail'||(send&&!account.gmail_send_enabled))throw new ChannelError('Reconnect Gmail with reply permission first.',409);
  const secret=JSON.parse(account.decrypted_secret);
  const token=await channelProviderJson('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:process.env.GMAIL_CLIENT_ID||'',client_secret:process.env.GMAIL_CLIENT_SECRET||'',refresh_token:secret.refresh_token,grant_type:'refresh_token'})});
  if(typeof token.access_token!=='string')throw new ChannelError('Gmail refresh unavailable.',502);
  return {account,headers:{Authorization:`Bearer ${token.access_token}`}};
}
export async function watchGmail(pool:Pool,org:string,user:string,id:string){
  const topic=process.env.GMAIL_PUBSUB_TOPIC||'';if(!/^projects\/[\w-]+\/topics\/[\w.-]+$/.test(topic))throw new ChannelError('Pub/Sub topic is not configured.',503);
  const {headers}=await gmailAccess(pool,org,user,id);
  const result=await channelProviderJson('https://gmail.googleapis.com/gmail/v1/users/me/watch',{method:'POST',headers:{...headers,'Content-Type':'application/json'},
    body:JSON.stringify({topicName:topic,labelIds:['INBOX'],labelFilterBehavior:'include'})});
  const expires=Number(result.expiration);if(!Number.isSafeInteger(expires)||expires<=Date.now()||expires>Date.now()+8*86400000)throw new Error('Invalid watch expiry');
  const client=await pool.connect();try{
    await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='5s'");
    const scope=(await client.query(`SELECT p.id FROM channel_accounts a JOIN connectors c ON c.id=a.connector_id
      JOIN environments e ON e.id=c.environment_id JOIN projects p ON p.id=e.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=a.owner_id
      WHERE a.connector_id=$1 AND a.owner_id=$2 AND p.organization_id=$3 AND m.role IN ('owner','admin')
      AND c.status='active' FOR UPDATE OF a FOR SHARE OF m,c`,[id,user,org])).rows[0];
    if(!scope)throw new ChannelError('Watch authorization changed.',403);
    await client.query('UPDATE channel_accounts SET gmail_watch_expires_at=to_timestamp($2/1000.0) WHERE connector_id=$1',[id,expires]);
    await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
      VALUES($1,$2,'user','gmail.watch',$3,'Gmail notification watch registered','success')`,[scope.id,user,createHash('sha256').update(id).digest('hex')]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  return {expiresAt:new Date(expires).toISOString()};
}
