import type {Pool,PoolClient} from 'pg';
import {createHash} from 'node:crypto';
import {ContextBuilder} from '../../../ai/src/context/context-builder';

export class ExperienceError extends Error {constructor(message:string,readonly status=400){super(message);}}
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function cleanMemory(value:unknown,max=1000,min=3){
  if(typeof value!=='string'||value.trim().length<min||value.length>max)throw new ExperienceError(`Text must contain ${min} to ${max} characters.`);
  return ContextBuilder.sanitizeText(value.trim()).replace(/(?:sk-|ghp_)[a-zA-Z0-9_-]{20,}/g,'[REDACTED_SECRET]');
}
export function outcomeWindows(rows:Array<{observed_at:string|Date;evidence:any}>,now=Date.now()){
  const count=(older:number,newer:number)=>{
    const selected=rows.filter(r=>{const age=now-new Date(r.observed_at).getTime();return age>=newer&&age<older;});
    const failures=selected.filter(r=>['failed','failure','error'].includes(r.evidence.status)).length;
    const successes=selected.filter(r=>['completed','success','succeeded'].includes(r.evidence.status)).length;
    return {samples:selected.length,failures,successes,unknown:selected.filter(r=>r.evidence.status==='unknown').length,
      failureRate:failures+successes?failures/(failures+successes):null};
  };
  const day=86400000;return {current:count(7*day,0),previous:count(14*day,7*day),
    limitation:'Outcome proxies, not model accuracy or causal proof. Compare equivalent workloads; missing outcomes are not successes.'};
}

export class ExperienceStore {
  constructor(private readonly pool:Pool){}
  private async scope<T>(org:string,user:string,project:string|null,admin:boolean,fn:(c:PoolClient)=>Promise<T>){
    if(project!==null&&!uuid.test(project))throw new ExperienceError('Valid project required.');
    const c=await this.pool.connect();try{
      await c.query('BEGIN');await c.query("SET LOCAL TIME ZONE 'UTC'");await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='15s'");
      const member=await c.query(`SELECT m.role FROM organization_members m WHERE m.organization_id=$1 AND m.user_id=$2
        AND ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM projects p WHERE p.id=$3 AND p.organization_id=$1)) FOR UPDATE OF m`,[org,user,project]);
      const role=member.rows[0]?.role;
      if(!role||(admin?!['owner','admin'].includes(role):project&&!['owner','admin','developer'].includes(role)))throw new ExperienceError('Experience access denied.',403);
      const result=await fn(c);await c.query('COMMIT');return result;
    }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
  }
  private async audit(c:PoolClient,org:string,user:string,project:string|null,action:string,id:string){
    const hash=createHash('sha256').update(id).digest('hex');
    const budget=await c.query(`INSERT INTO chat_request_budgets(organization_id,subject,bucket,requests)
      VALUES($1,$2,date_trunc('hour',now()),1) ON CONFLICT(organization_id,subject,bucket)
      DO UPDATE SET requests=chat_request_budgets.requests+1 WHERE chat_request_budgets.requests<120 RETURNING requests`,[org,`experience:${user}`]);
    if(!budget.rows.length)throw new ExperienceError('Experience change limit reached; retry next hour.',429);
    if(project)await c.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
      VALUES($1,$2,'user',$3,$4,'Experience changed','success')`,[project,user,action,hash]);
    else await c.query(`INSERT INTO organization_audit_events(organization_id,actor_id,action_name,parameters_hash)
      VALUES($1,$2,$3,$4)`,[org,user,action,hash]);
  }
  async memories(org:string,user:string){return this.scope(org,user,null,false,async c=>{
    await c.query('DELETE FROM personal_memories WHERE organization_id=$1 AND user_id=$2 AND expires_at<=now()',[org,user]);
    return (await c.query('SELECT id,kind,content,expires_at FROM personal_memories WHERE organization_id=$1 AND user_id=$2 ORDER BY updated_at DESC LIMIT 30',[org,user])).rows;
  });}
  async responseStats(org:string,user:string){return this.scope(org,user,null,false,async c=>(await c.query(`SELECT
    t.response_provider AS provider,t.response_model AS model,count(*)::int AS samples,
    round(avg(t.response_latency_ms)) AS average_latency_ms FROM chat_turns t JOIN chat_conversations co ON co.id=t.conversation_id
    WHERE co.organization_id=$1 AND co.user_id=$2 AND t.created_at>now()-interval '7 days'
    AND t.response_latency_ms IS NOT NULL GROUP BY t.response_provider,t.response_model ORDER BY samples DESC LIMIT 20`,[org,user])).rows);}
  async remember(org:string,user:string,input:any){
    if(!['preference','goal','constraint','correction'].includes(input.kind))throw new ExperienceError('Choose a supported memory kind.');
    const content=cleanMemory(input.content),days=Number(input.days??30);
    if(!Number.isInteger(days)||days<1||days>90)throw new ExperienceError('Memory expiry must be 1–90 days.');
    if(input.id&&!uuid.test(input.id))throw new ExperienceError('Invalid memory identifier.');
    return this.scope(org,user,null,false,async c=>{
      if(!input.id&&(await c.query('SELECT count(*)::int AS n FROM personal_memories WHERE organization_id=$1 AND user_id=$2',[org,user])).rows[0].n>=30)throw new ExperienceError('Remove an old memory before adding another.',409);
      const result=input.id?await c.query(`UPDATE personal_memories SET kind=$4,content=$5,expires_at=now()+$6*interval '1 day',updated_at=now()
        WHERE id=$1 AND organization_id=$2 AND user_id=$3 RETURNING id`,[input.id,org,user,input.kind,content,days]):
        await c.query(`INSERT INTO personal_memories(organization_id,user_id,kind,content,expires_at) VALUES($1,$2,$3,$4,now()+$5*interval '1 day') RETURNING id`,[org,user,input.kind,content,days]);
      if(!result.rows.length)throw new ExperienceError('Memory unavailable.',404);
      await this.audit(c,org,user,null,'memory.save',result.rows[0].id);return result.rows[0];
    });
  }
  async forget(org:string,user:string,id:string){
    if(!uuid.test(id))throw new ExperienceError('Invalid memory identifier.');
    return this.scope(org,user,null,false,async c=>{
      await c.query('DELETE FROM personal_memories WHERE id=$1 AND organization_id=$2 AND user_id=$3',[id,org,user]);
      await this.audit(c,org,user,null,'memory.forget',id);return {forgotten:true};
    });
  }
  async configure(org:string,user:string,project:string,enabled:boolean,days:number){
    if(typeof enabled!=='boolean'||!Number.isInteger(days)||days<7||days>90)throw new ExperienceError('Choose collection on/off and retention of 7–90 days.');
    return this.scope(org,user,project,true,async c=>{
      await c.query(`INSERT INTO experience_settings(project_id,enabled,retention_days) VALUES($1,$2,$3)
        ON CONFLICT(project_id) DO UPDATE SET enabled=excluded.enabled,retention_days=excluded.retention_days,
        enabled_at=CASE WHEN excluded.enabled AND NOT experience_settings.enabled THEN now() ELSE experience_settings.enabled_at END`,[project,enabled,days]);
      if(!enabled)await c.query('DELETE FROM experience_events WHERE project_id=$1',[project]);
      else await c.query("UPDATE experience_events SET expires_at=least(expires_at,observed_at+$2*interval '1 day') WHERE project_id=$1",[project,days]);
      await this.audit(c,org,user,project,'experience.configure',project);return {enabled,retentionDays:days};
    });
  }
  async list(org:string,user:string,project:string){return this.scope(org,user,project,false,async c=>{
    const settings=(await c.query('SELECT * FROM experience_settings WHERE project_id=$1',[project])).rows[0]||{enabled:false,retention_days:30};
    const events=(await c.query('SELECT * FROM experience_events WHERE project_id=$1 AND expires_at>now() ORDER BY observed_at DESC LIMIT 100',[project])).rows;
    const lessons=(await c.query(`SELECT l.* FROM experience_lessons l JOIN experience_events e ON e.id=l.event_id AND e.project_id=l.project_id
      WHERE l.project_id=$1 AND l.expires_at>now() AND e.expires_at>now() ORDER BY l.created_at DESC LIMIT 100`,[project])).rows;
    const outcomes=(await c.query(`SELECT observed_at,evidence FROM experience_events WHERE project_id=$1 AND expires_at>now()
      AND observed_at>now()-interval '14 days' AND kind IN ('coding','deployment','service') ORDER BY observed_at DESC LIMIT 10000`,[project])).rows;
    const shadow=(await c.query(`SELECT p.checkpoint_id,p.predicted_class,count(*)::int AS samples FROM experience_predictions p
      JOIN experience_events e ON e.id=p.event_id WHERE e.project_id=$1 AND e.expires_at>now()
      GROUP BY p.checkpoint_id,p.predicted_class`,[project])).rows;
    return {settings,events,lessons,shadow,outcomes:outcomeWindows(outcomes),outcomesTruncated:outcomes.length===10000};
  });}
  async feedback(org:string,user:string,project:string,input:any){
    if(!/^[0-9]+$/.test(String(input.turnId))||!uuid.test(input.conversationId||''))throw new ExperienceError('A saved conversation and turn are required.');
    const correction=cleanMemory(input.correction,2000,20);
    return this.scope(org,user,project,false,async c=>{
      const settings=(await c.query('SELECT * FROM experience_settings WHERE project_id=$1 AND enabled FOR SHARE',[project])).rows[0];
      if(!settings)throw new ExperienceError('Project experience collection is disabled.',409);
      const turn=(await c.query(`SELECT t.question,t.answer FROM chat_turns t JOIN chat_conversations co ON co.id=t.conversation_id
        WHERE t.id=$1 AND co.id=$2 AND co.organization_id=$3 AND co.user_id=$4`,[input.turnId,input.conversationId,org,user])).rows[0];
      if(!turn)throw new ExperienceError('Saved chat turn unavailable.',404);
      const evidence={question:ContextBuilder.sanitizeText(turn.question).slice(0,2000),answer:ContextBuilder.sanitizeText(turn.answer).slice(0,4000),correction,
        limitation:'User correction, not verified ground truth or permission to act.'};
      const result=await c.query(`INSERT INTO experience_events(project_id,kind,source_key,evidence,submitted_by,observed_at,expires_at)
        VALUES($1,'chat',$2,$3::jsonb,$4,now(),now()+$5*interval '1 day') ON CONFLICT(project_id,kind,source_key) DO NOTHING RETURNING id`,
        [project,`chat:${input.conversationId}:${input.turnId}`,JSON.stringify(evidence),user,settings.retention_days]);
      if(!result.rows.length)throw new ExperienceError('Feedback already exists for this turn.',409);
      await this.audit(c,org,user,project,'experience.feedback',result.rows[0].id);return result.rows[0];
    });
  }
  async propose(org:string,user:string,project:string,eventId:string,content:unknown){
    if(!uuid.test(eventId))throw new ExperienceError('Valid evidence identifier required.');
    const lesson=cleanMemory(content,2000,20);
    return this.scope(org,user,project,false,async c=>{
      const row=(await c.query(`SELECT e.* FROM experience_events e JOIN experience_settings s ON s.project_id=e.project_id
        WHERE e.id=$1 AND e.project_id=$2 AND e.expires_at>now() AND s.enabled FOR SHARE OF s,e`,[eventId,project])).rows[0];
      if(!row)throw new ExperienceError('Current evidence unavailable.',404);
      if((await c.query('SELECT count(*)::int AS n FROM experience_lessons WHERE event_id=$1',[eventId])).rows[0].n>=5)throw new ExperienceError('Review existing lessons for this evidence first.',409);
      const result=await c.query(`INSERT INTO experience_lessons(event_id,project_id,author_id,content,expires_at) VALUES($1,$2,$3,$4,$5) RETURNING id`,[eventId,project,user,lesson,row.expires_at]);
      await this.audit(c,org,user,project,'experience.propose',result.rows[0].id);return result.rows[0];
    });
  }
  async review(org:string,user:string,project:string,id:string,approve:boolean,note:unknown){
    if(!uuid.test(id)||typeof approve!=='boolean')throw new ExperienceError('Valid lesson review required.');
    const explanation=cleanMemory(note,2000,20);
    return this.scope(org,user,project,true,async c=>{
      const result=await c.query(`UPDATE experience_lessons l SET status=$4,reviewer_id=$2,review_note=$5
        FROM experience_events e,experience_settings s WHERE l.id=$1 AND l.project_id=$3 AND l.author_id<>$2
        AND l.status='pending' AND e.id=l.event_id AND e.project_id=l.project_id AND (e.submitted_by IS NULL OR e.submitted_by<>$2)
        AND s.project_id=l.project_id AND s.enabled AND e.expires_at>now() AND l.expires_at>now() RETURNING l.id`,[id,user,project,approve?'approved':'rejected',explanation]);
      if(!result.rows.length)throw new ExperienceError('Pending lesson unavailable or independent reviewer required.',409);
      await this.audit(c,org,user,project,approve?'experience.approve':'experience.reject',id);return result.rows[0];
    });
  }
  async revoke(org:string,user:string,project:string,id:string){
    if(!uuid.test(id))throw new ExperienceError('Valid lesson required.');
    return this.scope(org,user,project,true,async c=>{
      await c.query("UPDATE experience_lessons SET status='rejected' WHERE id=$1 AND project_id=$2",[id,project]);
      await this.audit(c,org,user,project,'experience.revoke',id);return {revoked:true};
    });
  }
  async retrieve(org:string,user:string,project:string|null,question:string){return this.scope(org,user,project,false,async c=>{
    const stop=new Set(['the','and','for','this','that','what','which','with','from','about','please','same','then','does','have','there','should','would','could']);
    const words=[...new Set(question.toLowerCase().match(/[a-z0-9]{3,}/g)||[])].filter(w=>!stop.has(w)).slice(-30);
    if(!words.length)return [];
    return (await c.query(`SELECT l.id,l.content,l.expires_at,l.event_id,l.project_id,p.name AS project_name,e.kind,e.observed_at,e.evidence,
      (SELECT count(*) FROM unnest($2::text[]) word WHERE strpos(lower(l.content),word)>0) AS score
      FROM experience_lessons l JOIN experience_events e ON e.id=l.event_id AND e.project_id=l.project_id
      JOIN experience_settings s ON s.project_id=l.project_id JOIN projects p ON p.id=l.project_id
      WHERE ($1::uuid IS NULL OR l.project_id=$1) AND p.organization_id=$3 AND l.status='approved' AND l.expires_at>now() AND e.expires_at>now() AND s.enabled
      AND EXISTS(SELECT 1 FROM organization_members m WHERE m.organization_id=p.organization_id AND m.user_id=$4 AND m.role IN ('owner','admin','developer'))
      AND EXISTS(SELECT 1 FROM organization_members m WHERE m.organization_id=p.organization_id AND m.user_id=l.author_id)
      AND EXISTS(SELECT 1 FROM organization_members m WHERE m.organization_id=p.organization_id AND m.user_id=l.reviewer_id AND m.role IN ('owner','admin'))
      AND EXISTS(SELECT 1 FROM unnest($2::text[]) word WHERE strpos(lower(l.content),word)>0)
      ORDER BY score DESC,l.created_at DESC LIMIT 4`,[project,words,org,user])).rows;
  });}
}
