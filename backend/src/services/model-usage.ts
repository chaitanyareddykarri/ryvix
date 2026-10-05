import type {Pool} from 'pg';
import type {ModelAttempt} from '../../../ai/src/model-attempt';
import {estimateUsageCost,tokenCount} from '../../../ai/src/token-usage';
type Scope={org:string;user:string;channel:'web'|'whatsapp'|'gmail';source:string};
export class ModelUsage{
 constructor(private readonly pool:Pool){}
 async record(scope:Scope,event:ModelAttempt){
  if(!/^[a-f0-9-]{36}$/i.test(event.id)||!event.provider||event.provider.length>100||!event.model||event.model.length>200||!Number.isInteger(event.latencyMs)||event.latencyMs<0||event.latencyMs>300000)throw new Error('Invalid model usage event');
  if(event.status==='started'){
   const queries={
    web:`SELECT c.id FROM chat_conversations c JOIN organization_members m ON m.organization_id=c.organization_id AND m.user_id=c.user_id WHERE c.id=$1 AND c.organization_id=$2 AND c.user_id=$3 AND c.lease_expires_at>now()`,
    whatsapp:`SELECT x.id FROM whatsapp_assistant_messages x JOIN whatsapp_assistant_sessions s ON s.id=x.session_id JOIN whatsapp_phone_links l ON l.connector_id=s.connector_id AND l.user_id=s.user_id JOIN connectors co ON co.id=s.connector_id JOIN channel_accounts a ON a.connector_id=co.id JOIN environments e ON e.id=co.environment_id JOIN projects p ON p.id=e.project_id AND p.organization_id=l.organization_id JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=s.user_id AND m.role IN ('owner','admin','developer') JOIN organization_members owner ON owner.organization_id=p.organization_id AND owner.user_id=a.owner_id AND owner.role IN ('owner','admin') WHERE x.id=$1 AND p.organization_id=$2 AND s.user_id=$3 AND s.enabled AND s.claim_until>now() AND x.status='processing' AND co.status='active' AND co.connector_type='whatsapp'`,
    gmail:`SELECT i.id FROM channel_inbox i JOIN channel_accounts a ON a.connector_id=i.connector_id JOIN connectors c ON c.id=a.connector_id JOIN environments e ON e.id=c.environment_id JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=a.owner_id WHERE i.id=$1 AND p.organization_id=$2 AND a.owner_id=$3 AND m.role IN ('owner','admin') AND c.status='active' AND c.connector_type='gmail' AND a.gmail_send_enabled`
   };
   const row=await this.pool.query(`INSERT INTO model_usage_attempts(id,organization_id,user_id,channel,source_id,provider,model,status)
    SELECT $4,$2,$3,$5,allowed.id,$6,$7,'started' FROM (${queries[scope.channel]}) allowed RETURNING id`,[scope.source,scope.org,scope.user,event.id,scope.channel,event.provider,event.model]);
   if(!row.rows.length)throw new Error('Model usage source unauthorized');return;
  }
  if(!['completed','failed','cancelled'].includes(event.status))throw new Error('Invalid model outcome');
  const usage=event.usage?{promptTokens:tokenCount(event.usage.promptTokens),completionTokens:tokenCount(event.usage.completionTokens),cachedInputTokens:tokenCount(event.usage.cachedInputTokens),cacheWriteTokens:tokenCount(event.usage.cacheWriteTokens)}:null;
  const measured=usage?{...usage,costEstimate:estimateUsageCost(event.provider,event.model,usage),coverage:event.status==='completed'?'completed response':'partial provider report; total charge unknown'}:null;
  // Completion may arrive after access revocation. Only an existing scoped start can be completed.
  await this.pool.query(`UPDATE model_usage_attempts SET status=$6,latency_ms=$7,usage=$8::jsonb,finished_at=now()
   WHERE id=$1 AND organization_id=$2 AND user_id=$3 AND channel=$4 AND source_id=$5 AND status='started'`,[event.id,scope.org,scope.user,scope.channel,scope.source,event.status,event.latencyMs,measured?JSON.stringify(measured):null]);
 }
 async list(org:string,user:string){return (await this.pool.query(`SELECT a.id,a.channel,a.provider,a.model,a.status,a.latency_ms,a.usage,a.created_at,a.finished_at
   FROM model_usage_attempts a JOIN organization_members m ON m.organization_id=a.organization_id AND m.user_id=a.user_id
   WHERE a.organization_id=$1 AND a.user_id=$2 ORDER BY a.created_at DESC LIMIT 100`,[org,user])).rows;}
}
