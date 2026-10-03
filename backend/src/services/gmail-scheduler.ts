import type {Pool} from 'pg';
import {pollGmail} from '../connectors/gmail-inbox';

export function scheduledGmailIds(raw:string): string[] {
  const ids=[...new Set(raw.split(',').map(s=>s.trim()).filter(Boolean))];
  if(!ids.length || ids.length>50 || ids.some(id=>!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))) {
    throw new Error('Configure 1–50 explicit Gmail connector UUIDs.');
  }
  return ids;
}

/** Deployment allowlist opts existing connected accounts into background polling. */
export async function pollScheduledGmail(pool:Pool,ids:string[],signal:AbortSignal,poll= pollGmail) {
  let polled=0,failed=0;
  for(const id of ids) {
    if(signal.aborted)break;
    const client=await pool.connect();let owned=false;
    try {
      owned=(await client.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS owned',[`gmail-poll:${id}`])).rows[0].owned;
      if(!owned)continue;
      const account=(await client.query(`SELECT p.organization_id,a.owner_id FROM channel_accounts a
        JOIN connectors c ON c.id=a.connector_id JOIN environments e ON e.id=c.environment_id
        JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=a.owner_id
        WHERE c.id=$1 AND c.connector_type='gmail' AND c.status='active' AND m.role IN ('owner','admin')`,[id])).rows[0];
      if(!account)continue;
      // pollGmail independently reauthorizes the owner and resolves the Vault credential.
      await poll(pool,account.organization_id,account.owner_id,id);polled++;
    } catch {failed++;}
    finally {
      // A lost connection also releases its session lock. Never return a locked client.
      let destroy=false;
      if(owned)try{await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[`gmail-poll:${id}`]);}catch{destroy=true;}
      client.release(destroy);
    }
  }
  return {polled,failed};
}
