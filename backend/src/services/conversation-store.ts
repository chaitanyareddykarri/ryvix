import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

export class ConversationError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export class ConversationStore {
  constructor(private readonly pool: Pool) {}
  private async transaction<T>(fn: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); await client.query("SET LOCAL lock_timeout='5s'");
      await client.query("SET LOCAL TIME ZONE 'UTC'");
      const result = await fn(client); await client.query('COMMIT'); return result;
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  }
  async begin(organizationId: string, userId: string, suppliedId?: string) {
    if (suppliedId && !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(suppliedId))
      throw new ConversationError('Invalid conversation identifier.', 400);
    return this.transaction(async client => {
      const member = await client.query('SELECT 1 FROM organization_members WHERE organization_id=$1 AND user_id=$2 FOR UPDATE', [organizationId,userId]);
      if (!member.rows.length) throw new ConversationError('Organization access denied.',403);
      const busy = await client.query('SELECT 1 FROM chat_conversations WHERE organization_id=$1 AND user_id=$2 AND lease_expires_at>now() LIMIT 1',[organizationId,userId]);
      if (busy.rows.length) throw new ConversationError('A conversation is already processing a response.',429);
      if (!suppliedId) {
        const recent = await client.query("SELECT count(*)::int AS count FROM chat_conversations WHERE organization_id=$1 AND user_id=$2 AND created_at>now()-interval '1 hour'",[organizationId,userId]);
        if ((recent.rows[0]?.count || 0)>=60) throw new ConversationError('Conversation creation limit reached. Retry later.',429);
      }
      const id = suppliedId || randomUUID(), lease = randomUUID();
      if (!suppliedId) await client.query('INSERT INTO chat_conversations(id,organization_id,user_id) VALUES($1,$2,$3)', [id,organizationId,userId]);
      const result = await client.query(`UPDATE chat_conversations SET lease_id=$4,lease_expires_at=now()+interval '3 minutes'
        WHERE id=$1 AND organization_id=$2 AND user_id=$3 AND (lease_expires_at IS NULL OR lease_expires_at<=now()) RETURNING id`, [id,organizationId,userId,lease]);
      if (!result.rows.length) throw new ConversationError('Conversation unavailable or already processing a response.',409);
      for (const [subject,limit] of [['organization',600],[`user:${userId}`,60]] as const) {
        const budget = await client.query(`INSERT INTO chat_request_budgets(organization_id,subject,bucket,requests)
          VALUES($1,$2,date_trunc('hour',now()),1)
          ON CONFLICT(organization_id,subject,bucket) DO UPDATE SET requests=chat_request_budgets.requests+1
          WHERE chat_request_budgets.requests<$3 RETURNING requests`,[organizationId,subject,limit]);
        if (!budget.rows.length) throw new ConversationError('Hourly chat request limit reached. Retry next hour.',429);
      }
      await client.query("DELETE FROM chat_request_budgets WHERE organization_id=$1 AND bucket<now()-interval '2 days'",[organizationId]);
      await client.query("DELETE FROM chat_turns WHERE conversation_id=$1 AND created_at<now()-interval '30 days'", [id]);
      const turns = await client.query('SELECT question,answer FROM chat_turns WHERE conversation_id=$1 ORDER BY id DESC LIMIT 12', [id]);
      let budget = 24000;
      const selected: Array<{ question: string; answer: string }> = [];
      for (const turn of turns.rows) {
        const question = turn.question.length>4000 ? turn.question.slice(0,3900)+'\n[Earlier question truncated]' : turn.question;
        const answer = turn.answer.length>8000 ? turn.answer.slice(0,7900)+'\n[Earlier answer truncated]' : turn.answer;
        const size = question.length + answer.length;
        if (size > budget) break;
        selected.unshift({question,answer}); budget -= size;
      }
      return { id, lease, history: selected.flatMap(turn => [
        { role: 'user' as const, content: turn.question }, { role: 'assistant' as const, content: turn.answer },
      ]) };
    });
  }
  async finish(id: string, lease: string, organizationId: string, userId: string, question: string, answer: string,measurement?:{latencyMs:number;provider?:string;model?:string;usage?:unknown}) {
    if(measurement&&(!Number.isInteger(measurement.latencyMs)||measurement.latencyMs<0||measurement.latencyMs>300000||
      (measurement.provider?.length||0)>100||(measurement.model?.length||0)>200))throw new ConversationError('Invalid response measurement.',400);
    return this.transaction(async client => {
      const member = await client.query('SELECT 1 FROM organization_members WHERE organization_id=$1 AND user_id=$2 FOR SHARE',[organizationId,userId]);
      if (!member.rows.length) throw new ConversationError('Organization access denied.',403);
      const owned = await client.query(`UPDATE chat_conversations SET lease_id=NULL,lease_expires_at=NULL
        WHERE id=$1 AND lease_id=$2 AND organization_id=$3 AND user_id=$4 AND lease_expires_at>now() RETURNING id`,[id,lease,organizationId,userId]);
      if (!owned.rows.length) throw new ConversationError('Conversation lease expired.',409);
      const saved=await client.query(`INSERT INTO chat_turns(conversation_id,question,answer,response_latency_ms,response_provider,response_model,response_usage)
        VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id`,[id,question,answer,measurement?.latencyMs??null,measurement?.provider??null,measurement?.model??null,measurement?.usage?JSON.stringify(measurement.usage):null]);
      await client.query('DELETE FROM chat_turns WHERE conversation_id=$1 AND id NOT IN (SELECT id FROM chat_turns WHERE conversation_id=$1 ORDER BY id DESC LIMIT 100)',[id]);
      return String(saved.rows[0].id);
    });
  }
  async release(id: string, lease: string) {
    await this.pool.query('UPDATE chat_conversations SET lease_id=NULL,lease_expires_at=NULL WHERE id=$1 AND lease_id=$2',[id,lease]);
  }
}
