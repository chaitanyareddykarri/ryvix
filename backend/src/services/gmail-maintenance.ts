import type {Pool} from 'pg';
import {watchGmail} from '../connectors/gmail-api';
import {pollScheduledGmail} from './gmail-scheduler';

/** Notifications wake the existing authorized poller; they never supply a cursor. */
export async function gmailWorkerCycle(pool:Pool,ids:string[],signal:AbortSignal,periodic:boolean,
  poll=pollScheduledGmail,watch=watchGmail){
  const pending=(await pool.query(`SELECT connector_id,provider_message_id FROM gmail_push_events
    WHERE connector_id=ANY($1::uuid[]) AND processed_at IS NULL ORDER BY created_at LIMIT 500`,[ids])).rows;
  const selected=periodic?ids:[...new Set<string>(pending.map(r=>r.connector_id))];
  let polled=0,failed=0;
  for(const id of selected){
    if(signal.aborted)break;
    const result=await poll(pool,[id],signal);polled+=result.polled;failed+=result.failed;
    // Only acknowledge the exact events observed before the successful poll.
    if(result.polled)await pool.query(`UPDATE gmail_push_events SET processed_at=now()
      WHERE connector_id=$1 AND provider_message_id=ANY($2::text[]) AND processed_at IS NULL`,
      [id,pending.filter(r=>r.connector_id===id).map(r=>r.provider_message_id)]);
  }
  if(periodic&&!signal.aborted){
    const renew=(await pool.query(`SELECT a.connector_id,a.owner_id,p.organization_id FROM channel_accounts a
      JOIN connectors c ON c.id=a.connector_id JOIN environments e ON e.id=c.environment_id
      JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=a.owner_id
      WHERE a.connector_id=ANY($1::uuid[]) AND c.connector_type='gmail' AND c.status='active'
      AND m.role IN ('owner','admin') AND a.gmail_watch_expires_at<now()+interval '1 day'`,[ids])).rows;
    for(const row of renew){if(signal.aborted)break;
      try{await watch(pool,row.organization_id,row.owner_id,row.connector_id);}catch{failed++;}}
    await pool.query(`UPDATE gmail_reply_drafts SET status=CASE WHEN status='sending' THEN 'unknown' ELSE 'expired' END
      WHERE connector_id=ANY($1::uuid[]) AND status IN ('pending','sending') AND expires_at<now()`,[ids]);
    await pool.query(`DELETE FROM gmail_push_events WHERE connector_id=ANY($1::uuid[])
      AND processed_at<now()-interval '7 days'`,[ids]);
  }
  return {polled,failed};
}
