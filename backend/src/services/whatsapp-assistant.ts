import {randomUUID,createHash} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {ChannelError} from './channel-inbox';
import {routeWhatsApp} from '../../../ai/src/whatsapp-router';
import {sendWhatsAppReply} from '../../../services/src/communication/whatsapp-replies';
import {ContextBuilder} from '../../../ai/src/context/context-builder';
import {RepositoryKnowledge} from './repository-knowledge';
import {ExperienceStore} from './experience-store';
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const clean=(s:string)=>ContextBuilder.sanitizeText(s).slice(0,3500);
function appLink(path:string){const u=new URL(process.env.RYVIX_PUBLIC_URL||'');if(u.protocol!=='https:'||u.username||u.password)throw new Error('Public HTTPS URL required');return u.origin+path;}
export class WhatsAppAssistant {
  constructor(private readonly pool:Pool,private readonly route=routeWhatsApp,private readonly send=sendWhatsAppReply){}
  private async tx<T>(fn:(c:PoolClient)=>Promise<T>){const c=await this.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='20s'");const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
  private joins=`FROM whatsapp_assistant_sessions s JOIN whatsapp_phone_links l ON l.connector_id=s.connector_id AND l.user_id=s.user_id
    JOIN connectors co ON co.id=l.connector_id JOIN channel_accounts a ON a.connector_id=co.id
    JOIN environments e ON e.id=co.environment_id JOIN projects p ON p.id=e.project_id AND p.organization_id=l.organization_id
    JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=l.user_id AND m.role IN ('owner','admin','developer')
    JOIN organization_members owner ON owner.organization_id=p.organization_id AND owner.user_id=a.owner_id AND owner.role IN ('owner','admin')`;
  private async scope(c:PoolClient,id:string,enabled=true){
    const row=(await c.query(`SELECT s.*,l.phone,p.id AS project_id,p.organization_id,m.role,a.provider_subject ${this.joins}
      WHERE s.id=$1 AND co.status='active' AND co.connector_type='whatsapp' AND (s.enabled OR NOT $2)
      FOR UPDATE OF s FOR SHARE OF l,co,a,p,e,m,owner`,[id,enabled])).rows[0];
    if(!row)throw new ChannelError('Assistant access unavailable.',403);return row;
  }
  private async audit(c:PoolClient,s:any,action:string,id:string){await c.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
    VALUES($1,$2,'user',$3,$4,'WhatsApp assistant lifecycle','success')`,[s.project_id,s.user_id,action,createHash('sha256').update(id).digest('hex')]);}
  async configure(org:string,user:string,connector:string,enabled:boolean,notifications:boolean){
    if(!uuid.test(connector)||typeof enabled!=='boolean'||typeof notifications!=='boolean')throw new ChannelError('Connection and choices required.',400);
    return this.tx(async c=>{
      const link=(await c.query(`SELECT l.connector_id FROM whatsapp_phone_links l JOIN organization_members m ON m.organization_id=l.organization_id AND m.user_id=l.user_id
        WHERE l.organization_id=$1 AND l.user_id=$2 AND l.connector_id=$3 FOR SHARE OF l,m`,[org,user,connector])).rows[0];
      if(!link)throw new ChannelError('Verify your number first.',403);
      const row=(await c.query(`INSERT INTO whatsapp_assistant_sessions(connector_id,user_id) VALUES($1,$2)
        ON CONFLICT(connector_id,user_id) DO UPDATE SET user_id=excluded.user_id RETURNING id`,[connector,user])).rows[0];
      const s=await this.scope(c,row.id,false);
      await c.query(`UPDATE whatsapp_assistant_sessions SET enabled=$2,notifications=$3,enabled_at=CASE WHEN enabled=$2 THEN enabled_at ELSE now() END WHERE id=$1`,[s.id,enabled,notifications]);
      if(!enabled){await c.query("UPDATE whatsapp_assistant_messages SET status='cancelled' WHERE session_id=$1 AND status IN ('pending','processing')",[s.id]);
        await c.query("UPDATE whatsapp_assistant_proposals SET status='expired' WHERE session_id=$1 AND status='pending'",[s.id]);
        await c.query('UPDATE whatsapp_assistant_sessions SET claim=NULL,claim_until=NULL WHERE id=$1',[s.id]);}
      await c.query("UPDATE whatsapp_assistant_outbox SET status='cancelled' WHERE session_id=$1 AND status IN ('pending','window_closed') AND (NOT $2 OR (proactive AND NOT $3))",[s.id,enabled,notifications]);
      await this.audit(c,s,'whatsapp.assistant.configure',s.id);return {enabled,notifications};
    });
  }
  async dashboard(org:string,user:string){const sessions=(await this.pool.query(`SELECT s.id,s.connector_id,s.enabled,s.notifications,p.name AS project_name ${this.joins} WHERE p.organization_id=$1 AND s.user_id=$2 AND co.status='active'`,[org,user])).rows;
    const ids=sessions.map(s=>s.id);if(!ids.length)return {sessions,messages:[],deliveries:[],proposals:[]};
    const messages=(await this.pool.query('SELECT id,question,answer,status,provider,model,prompt_tokens,completion_tokens,created_at FROM whatsapp_assistant_messages WHERE session_id=ANY($1::uuid[]) ORDER BY created_at DESC LIMIT 50',[ids])).rows;
    const deliveries=(await this.pool.query('SELECT id,body,status,created_at FROM whatsapp_assistant_outbox WHERE session_id=ANY($1::uuid[]) ORDER BY created_at DESC LIMIT 50',[ids])).rows;
    const proposals=(await this.pool.query('SELECT id,repository_id,prompt,status,task_id,expires_at FROM whatsapp_assistant_proposals WHERE session_id=ANY($1::uuid[]) ORDER BY created_at DESC LIMIT 20',[ids])).rows;
    return {sessions,messages,deliveries,proposals};
  }
  async receive(connector:string,providerId:string,sender:string,timestamp:number){
    // Do not derive the service window from webhook arrival or replay time.
    if(!Number.isSafeInteger(timestamp)||timestamp*1000>Date.now()+60000||timestamp*1000<Date.now()-86400000)return;
    return this.tx(async c=>{
      const found=(await c.query(`SELECT s.id ${this.joins} WHERE s.connector_id=$1 AND l.phone='+'||$2 AND s.enabled AND co.status='active'`,[connector,sender])).rows[0];
      if(!found)return;const s=await this.scope(c,found.id);
      const incoming=(await c.query(`SELECT id,content FROM channel_inbox WHERE connector_id=$1 AND provider_message_id=$2 AND sender_user_id=$3
        AND sender=$4 AND created_at>= $5 AND status='pending' FOR UPDATE`,[connector,providerId,s.user_id,sender,s.enabled_at])).rows[0];
      if(!incoming)return;
      const result=await c.query(`INSERT INTO whatsapp_assistant_messages(session_id,inbox_id,question) VALUES($1,$2,$3) ON CONFLICT(inbox_id) DO NOTHING RETURNING id`,[s.id,incoming.id,incoming.content]);
      if(result.rows.length){await c.query('UPDATE whatsapp_assistant_sessions SET last_inbound_at=greatest(last_inbound_at,to_timestamp($2)) WHERE id=$1',[s.id,timestamp]);await this.audit(c,s,'whatsapp.assistant.receive',result.rows[0].id);}
    });
  }
  private async enqueue(c:PoolClient,s:any,key:string,body:string,proactive=false){const r=await c.query(`INSERT INTO whatsapp_assistant_outbox(session_id,source_key,body,proactive) VALUES($1,$2,$3,$4) ON CONFLICT(session_id,source_key) DO NOTHING RETURNING id`,[s.id,key,clean(body),proactive]);if(r.rows.length)await this.audit(c,s,'whatsapp.assistant.reply.queued',r.rows[0].id);}
  private async context(s:any){
    const repositories=(await this.pool.query('SELECT id,full_name FROM repositories WHERE project_id=$1 ORDER BY full_name LIMIT 30',[s.project_id])).rows;
    const tasks=(await this.pool.query('SELECT id,status,created_at FROM tasks WHERE project_id=$1 AND created_by=$2 ORDER BY created_at DESC LIMIT 8',[s.project_id,s.user_id])).rows;
    const servers=(await this.pool.query(`SELECT h.id,h.hostname,h.status AS recorded_status,t.last_sample_at,t.cpu_avg,t.ram_percent,t.disk_used_percent FROM servers h JOIN environments e ON e.id=h.environment_id
      LEFT JOIN LATERAL(SELECT last_sample_at,cpu_avg,ram_percent,disk_used_percent FROM telemetry_metric_rollups WHERE server_id=h.id AND authenticated=true ORDER BY last_sample_at DESC LIMIT 1)t ON true
      WHERE e.project_id=$1 LIMIT 15`,[s.project_id])).rows;
    const history=(await this.pool.query("SELECT question,answer FROM whatsapp_assistant_messages WHERE session_id=$1 AND status='done' AND created_at>now()-interval '30 days' ORDER BY created_at DESC LIMIT 6",[s.id])).rows.reverse();
    const approvals=['owner','admin'].includes(s.role)?(await this.pool.query("SELECT id,server_id,status FROM cloud_recovery_requests WHERE project_id=$1 AND status='pending' AND requested_by<>$2 ORDER BY created_at DESC LIMIT 5",[s.project_id,s.user_id])).rows:[];
    return {repositories,tasks,servers,history,approvals};
  }
  async processOne(onlySession?:string){
    const job=await this.tx(async c=>{
      const found=(await c.query(`SELECT s.id ${this.joins} WHERE s.enabled AND co.status='active' AND (s.claim_until IS NULL OR s.claim_until<now())
        AND ($1::uuid IS NULL OR s.id=$1) AND EXISTS(SELECT 1 FROM whatsapp_assistant_messages x WHERE x.session_id=s.id AND x.status='pending') ORDER BY s.last_inbound_at LIMIT 1 FOR UPDATE OF s SKIP LOCKED`,[onlySession||null])).rows[0];
      if(!found)return null;const s=await this.scope(c,found.id);
      const message=(await c.query("SELECT * FROM whatsapp_assistant_messages WHERE session_id=$1 AND status='pending' ORDER BY created_at,id LIMIT 1 FOR UPDATE",[s.id])).rows[0];
      const quota=await c.query(`INSERT INTO chat_request_budgets(organization_id,subject,bucket,requests) VALUES($1,$2,date_trunc('hour',now()),1)
        ON CONFLICT(organization_id,subject,bucket) DO UPDATE SET requests=chat_request_budgets.requests+1 WHERE chat_request_budgets.requests<30 RETURNING requests`,[s.organization_id,`whatsapp-ai:${s.user_id}`]);
      if(!quota.rows.length){await c.query("UPDATE whatsapp_assistant_messages SET status='cancelled' WHERE id=$1",[message.id]);await this.enqueue(c,s,`quota:${new Date().toISOString().slice(0,13)}`,'Your WhatsApp request limit is reached. Try again next hour.');return null;}
      const claim=randomUUID();await c.query("UPDATE whatsapp_assistant_messages SET status='processing' WHERE id=$1",[message.id]);
      await c.query("UPDATE whatsapp_assistant_sessions SET claim=$2,claim_until=now()+interval '3 minutes' WHERE id=$1",[s.id,claim]);return {s,message,claim};
    });if(!job)return false;
    const {s,message,claim}=job;let result:Awaited<ReturnType<typeof routeWhatsApp>>|undefined,ctx:Awaited<ReturnType<WhatsAppAssistant['context']>>|undefined;
    const confirmation=/^(CONFIRM|REJECT) ([a-f0-9-]{36})$/i.exec(message.question.trim());
    try{
      if(!confirmation){ctx=await this.context(s);
        const sources=await new RepositoryKnowledge(this.pool).search(s.organization_id,s.user_id,null,message.question);
        // Repository retrieval is narrowed to the connected project's explicit repository set.
        const allowed=new Set(ctx.repositories.map(r=>r.id));
        const lessons=['owner','admin','developer'].includes(s.role)?await new ExperienceStore(this.pool).retrieve(s.organization_id,s.user_id,s.project_id,message.question):[];
        result=await this.route({question:message.question,history:ctx.history,context:{...ctx,history:undefined,lessons,sources:sources.filter(r=>allowed.has(r.repository_id)),asOf:new Date().toISOString()}});
      }
      await this.tx(async c=>{const current=await this.scope(c,s.id);
        if(current.claim!==claim||new Date(current.claim_until).getTime()<Date.now())throw new Error('Expired assistant claim');
        const inbox=await c.query("SELECT id FROM channel_inbox WHERE id=$1 AND status='pending' AND sender_user_id=$2 FOR UPDATE",[message.inbox_id,current.user_id]);
        if(!inbox.rows.length)throw new Error('Message already reviewed or identity revoked');
        let answer='';
        if(confirmation)answer=await this.confirm(c,current,confirmation[2],confirmation[1].toUpperCase()==='CONFIRM');
        else{const decision=result!.decision;
          if(decision.intent==='coding'){
            if(!['owner','admin','developer'].includes(current.role))answer='Your role cannot create coding tasks.';
            else{const repo=(await c.query('SELECT id,full_name FROM repositories WHERE id=$1 AND project_id=$2 FOR SHARE',[uuid.test(decision.repositoryId||'')?decision.repositoryId:null,current.project_id])).rows[0];
              if(!repo||!decision.prompt?.trim()||decision.prompt.length>1800)answer='Choose an authorized repository and describe a change short enough to review in full.';
              else{const proposal=(await c.query('INSERT INTO whatsapp_assistant_proposals(session_id,message_id,repository_id,prompt) VALUES($1,$2,$3,$4) RETURNING id,expires_at',[s.id,message.id,repo.id,decision.prompt])).rows[0];
                answer=`Proposed coding task for ${repo.full_name}:\n${decision.prompt}\n\nReply CONFIRM ${proposal.id} to queue exactly this task, or REJECT ${proposal.id}. Expires at ${new Date(proposal.expires_at).toISOString()}. This does not approve a PR, merge or deployment.`;}
            }
          }else if(decision.intent==='status')answer=ctx!.tasks.length?'Your recent recorded tasks:\n'+ctx!.tasks.map(t=>`${t.id}: ${t.status}`).join('\n'):'No tasks recorded for you in this project.';
          else if(decision.intent==='servers')answer=ctx!.servers.length?'Recorded server observations (not a current health guarantee):\n'+ctx!.servers.map(h=>`${h.hostname}: ${h.recorded_status}; authenticated sample ${h.last_sample_at?new Date(h.last_sample_at).toISOString():'unavailable'}; CPU ${h.cpu_avg??'unavailable'}%, RAM ${h.ram_percent??'unavailable'}%`).join('\n'):'No server observations available in this project.';
          else if(decision.intent==='approvals')answer=`Review the exact item after signing in:\n${ctx!.tasks.slice(0,5).map(t=>`Task ${t.id}: ${appLink('/tasks?task='+t.id)}\nRelease: ${appLink('/releases?task='+t.id)}`).join('\n')}\n${ctx!.approvals.map(a=>`Recovery ${a.id}: ${appLink('/recovery?request='+a.id)}`).join('\n')}\nService approvals: ${appLink('/operations')}\nCurrent roles, independent approval, expiry and reviewed commit checks still apply. A chat YES does not approve these operations.`;
          else if(decision.intent==='connect')answer=`Connect a repository through the dashboard GitHub connection settings: ${appLink('/dashboard')}\nDo not send tokens or passwords here.`;
          else answer=decision.reply||'Ask about this project, your tasks, server status, or a coding change.';
        }
        answer=clean(answer);await this.enqueue(c,current,`reply:${message.id}`,answer);
        await c.query("UPDATE whatsapp_assistant_messages SET status='done',answer=$2,provider=$3,model=$4,prompt_tokens=$5,completion_tokens=$6,latency_ms=$7 WHERE id=$1",[message.id,answer,result?.provider||null,result?.model||null,result?.promptTokens??null,result?.completionTokens??null,result?.latencyMs??null]);
        if(!await c.query('SELECT 1 FROM whatsapp_assistant_proposals WHERE message_id=$1',[message.id]).then(r=>r.rows.length))await c.query("UPDATE channel_inbox SET status='rejected' WHERE id=$1 AND status='pending'",[message.inbox_id]);
        await c.query('UPDATE whatsapp_assistant_sessions SET claim=NULL,claim_until=NULL WHERE id=$1',[s.id]);await this.audit(c,current,'whatsapp.assistant.processed',message.id);
      });return true;
    }catch{
      await this.tx(async c=>{const current=await this.scope(c,s.id);if(current.claim!==claim)return;
        await c.query("UPDATE whatsapp_assistant_messages SET status='unknown' WHERE id=$1 AND status='processing'",[message.id]);
        await this.enqueue(c,current,`failure:${message.id}`,'I could not complete this request. No new action was confirmed by this response. Check the dashboard before retrying.');
        await c.query('UPDATE whatsapp_assistant_sessions SET claim=NULL,claim_until=NULL WHERE id=$1',[s.id]);
      }).catch(()=>{});return false;
    }
  }
  private async confirm(c:PoolClient,s:any,id:string,accept:boolean){
    const proposal=(await c.query(`SELECT q.*,x.inbox_id FROM whatsapp_assistant_proposals q JOIN whatsapp_assistant_messages x ON x.id=q.message_id
      WHERE q.id=$1 AND q.session_id=$2 AND q.status='pending' AND q.expires_at>now() FOR UPDATE OF q`,[id,s.id])).rows[0];
    if(!proposal)return 'Confirmation unavailable, expired or already used.';
    if(!accept){await c.query("UPDATE whatsapp_assistant_proposals SET status='rejected' WHERE id=$1",[id]);await c.query("UPDATE channel_inbox SET status='rejected' WHERE id=$1 AND status='pending'",[proposal.inbox_id]);await this.audit(c,s,'whatsapp.assistant.task.rejected',id);return 'Coding proposal rejected.';}
    if(!['owner','admin','developer'].includes(s.role))return 'Your current role cannot create tasks.';
    const inbox=(await c.query("SELECT id FROM channel_inbox WHERE id=$1 AND status='pending' AND sender_user_id=$2 FOR UPDATE",[proposal.inbox_id,s.user_id])).rows[0];
    const repo=(await c.query('SELECT id FROM repositories WHERE id=$1 AND project_id=$2 FOR SHARE',[proposal.repository_id,s.project_id])).rows[0];
    if(!inbox||!repo)return 'The proposal was already reviewed or its repository is no longer available.';
    const credential=(await c.query(`SELECT co.id FROM connectors co JOIN environments e ON e.id=co.environment_id JOIN connector_credentials cc ON cc.connector_id=co.id
      WHERE e.project_id=$1 AND co.connector_type='github' AND co.status='active' AND cc.credential_type='oauth_token' AND (cc.expires_at IS NULL OR cc.expires_at>now()) LIMIT 1`,[s.project_id])).rows[0];
    if(!credential)return 'Connect GitHub in the dashboard before confirming.';
    await c.query('SELECT id FROM projects WHERE id=$1 FOR UPDATE',[s.project_id]);
    const count=(await c.query("SELECT count(*)::int AS n FROM repository_jobs j JOIN tasks t ON t.id=j.task_id WHERE t.project_id=$1 AND j.status IN ('queued','running')",[s.project_id])).rows[0].n;
    if(count>=10)return 'The project task queue is full. Try this confirmation again before it expires.';
    const task=(await c.query("INSERT INTO tasks(project_id,created_by,channel,task_type,status,user_prompt) VALUES($1,$2,'whatsapp','coding','queued',$3) RETURNING id",[s.project_id,s.user_id,proposal.prompt])).rows[0];
    await c.query('INSERT INTO repository_jobs(task_id,repository_id) VALUES($1,$2)',[task.id,repo.id]);
    await c.query("UPDATE channel_inbox SET status='accepted',task_id=$2 WHERE id=$1",[proposal.inbox_id,task.id]);
    await c.query("UPDATE whatsapp_assistant_proposals SET status='confirmed',task_id=$2 WHERE id=$1",[id,task.id]);
    await this.audit(c,s,'whatsapp.assistant.task.confirmed',task.id);return `Task queued: ${task.id}. No PR or deployment has been approved. Review progress: ${appLink('/tasks?task='+task.id)}`;
  }
  async notifications(){const sessions=(await this.pool.query(`SELECT s.id ${this.joins} WHERE s.enabled AND s.notifications AND co.status='active' LIMIT 100`)).rows;
    for(const row of sessions)await this.tx(async c=>{const s=await this.scope(c,row.id);if(!s.notifications)return;
      const tasks=(await c.query(`SELECT t.id,t.status,EXISTS(SELECT 1 FROM pull_requests pr WHERE pr.task_id=t.id) AS pr_ready,
        EXISTS(SELECT 1 FROM task_artifacts a WHERE a.task_id=t.id) AS artifacts,
        EXISTS(SELECT 1 FROM workspace_sessions w WHERE w.task_id=t.id AND w.project_id=t.project_id AND w.status='active' AND w.preview_url IS NOT NULL AND w.expires_at>now()) AS preview,
        release.status AS release_status,deployment.id AS deployment_id,deployment.state AS deployment_state
        FROM whatsapp_assistant_proposals q JOIN tasks t ON t.id=q.task_id
        LEFT JOIN release_requests release ON release.task_id=t.id
        LEFT JOIN LATERAL (SELECT d.id,d.state FROM deployment_events d JOIN deployment_targets target ON target.id=release.target_id
          AND target.repository_id=d.repository_id AND target.provider_environment=d.environment AND target.updated_at=release.target_version
          WHERE release.status='merged' AND d.repository_id=release.repository_id AND d.commit_sha=release.merge_sha AND d.provider_created_at>=release.created_at
          AND d.state IN ('success','failure','error') ORDER BY d.provider_created_at DESC,d.github_status_id DESC LIMIT 1)deployment ON true
        WHERE q.session_id=$1 AND t.project_id=$2 AND t.created_by=$3 AND q.created_at>now()-interval '30 days' ORDER BY q.created_at DESC LIMIT 30`,[s.id,s.project_id,s.user_id])).rows;
      for(const t of tasks){const state=`${t.status}:${t.pr_ready}:${t.artifacts}:${t.preview}:${t.release_status||''}:${t.deployment_id||''}`;
        await this.enqueue(c,s,`task:${t.id}:${state}`,`Task ${t.id}: ${t.status}.${t.artifacts?' Review saved changes and checks in the dashboard.':''}${t.preview?' An unexpired preview is recorded; open the dashboard to review it.':''}${t.pr_ready?' A PR record is available; review it before approving a release.':''}${t.release_status?` Release status: ${t.release_status}.`:''}${t.deployment_state?` Matching signed deployment provider result: ${t.deployment_state}; runtime health is separate.`:''}\n${appLink('/tasks?task='+t.id)}\nRelease approval: ${appLink('/releases?task='+t.id)}\nA PR or main-branch merge alone does not prove deployment.`,true);}
    }).catch(()=>{});
  }
  async dispatchOne(onlySession?:string){const job=await this.tx(async c=>{
    const r=(await c.query("SELECT o.* FROM whatsapp_assistant_outbox o WHERE o.status='pending' AND ($1::uuid IS NULL OR o.session_id=$1) AND (SELECT count(*) FROM whatsapp_assistant_outbox sent WHERE sent.session_id=o.session_id AND sent.claimed_at>now()-interval '1 minute')<3 ORDER BY o.created_at LIMIT 1 FOR UPDATE OF o SKIP LOCKED",[onlySession||null])).rows[0];if(!r)return null;
    let s;try{s=await this.scope(c,r.session_id);}catch{await c.query("UPDATE whatsapp_assistant_outbox SET status='cancelled' WHERE id=$1",[r.id]);return null;}
    if(r.proactive&&!s.notifications){await c.query("UPDATE whatsapp_assistant_outbox SET status='cancelled' WHERE id=$1",[r.id]);return null;}
    const template=!s.last_inbound_at||new Date(s.last_inbound_at).getTime()<Date.now()-86400000;
    if(template&&(!r.proactive||!process.env.WHATSAPP_ASSISTANT_UPDATE_TEMPLATE)){await c.query("UPDATE whatsapp_assistant_outbox SET status='window_closed' WHERE id=$1",[r.id]);return null;}
    const token=(await c.query(`SELECT v.decrypted_secret FROM connector_credentials cc JOIN vault.decrypted_secrets v ON v.id::text=cc.vault_secret_ref
      WHERE cc.connector_id=$1 AND cc.credential_type='oauth_token' AND (cc.expires_at IS NULL OR cc.expires_at>now()) LIMIT 1`,[s.connector_id])).rows[0];
    if(!token)throw new Error('Provider credential unavailable');
    const sent=(await c.query("SELECT count(*)::int AS n FROM whatsapp_assistant_outbox WHERE session_id=$1 AND claimed_at>now()-interval '1 minute'",[s.id])).rows[0].n;
    if(sent>=3)return null;
    await c.query("UPDATE whatsapp_assistant_outbox SET status='sending',claimed_at=now() WHERE id=$1",[r.id]);await this.audit(c,s,'whatsapp.assistant.dispatch',r.id);
    return {...r,project_id:s.project_id,user_id:s.user_id,phone:s.provider_subject.slice('whatsapp:'.length),recipient:s.phone.slice(1),token:token.decrypted_secret,template};
  });if(!job)return false;let id:string|null=null;try{id=await this.send(job);}catch{}
    await this.tx(async c=>{const updated=await c.query("UPDATE whatsapp_assistant_outbox SET status=$2,provider_message_id=$3 WHERE id=$1 AND status='sending' RETURNING id",[job.id,id?'accepted':'unknown',id]);if(updated.rows.length)await this.audit(c,job,id?'whatsapp.assistant.reply.accepted':'whatsapp.assistant.reply.unknown',job.id);});return !!id;
  }
  async maintenance(){
    await this.pool.query("UPDATE whatsapp_assistant_outbox SET status='unknown' WHERE status='sending' AND claimed_at<now()-interval '1 minute'");
    await this.pool.query(`UPDATE whatsapp_assistant_messages x SET status='unknown' FROM whatsapp_assistant_sessions s WHERE x.session_id=s.id AND x.status='processing' AND (s.claim_until IS NULL OR s.claim_until<now())`);
    await this.pool.query("UPDATE whatsapp_assistant_proposals SET status='expired' WHERE status='pending' AND expires_at<now()");
    await this.pool.query(`UPDATE whatsapp_assistant_outbox o SET status=r.status FROM (SELECT DISTINCT ON(o.id) o.id,r.status FROM whatsapp_assistant_outbox o
      JOIN whatsapp_assistant_sessions s ON s.id=o.session_id JOIN whatsapp_phone_links l ON l.connector_id=s.connector_id AND l.user_id=s.user_id
      JOIN whatsapp_alert_receipts r ON r.connector_id=s.connector_id AND r.message_id=o.provider_message_id AND r.recipient=substring(l.phone FROM 2)
      WHERE o.status IN ('accepted','unknown','sent','failed','delivered','read') ORDER BY o.id,CASE r.status WHEN 'read' THEN 4 WHEN 'delivered' THEN 3 WHEN 'failed' THEN 2 ELSE 1 END DESC)r WHERE o.id=r.id
      AND CASE r.status WHEN 'read' THEN 4 WHEN 'delivered' THEN 3 WHEN 'failed' THEN 2 ELSE 1 END > CASE o.status WHEN 'read' THEN 4 WHEN 'delivered' THEN 3 WHEN 'failed' THEN 2 WHEN 'sent' THEN 1 ELSE 0 END`);
    await this.pool.query("DELETE FROM whatsapp_assistant_messages WHERE created_at<now()-interval '30 days' AND status<>'processing'");
    await this.pool.query("DELETE FROM whatsapp_assistant_outbox WHERE created_at<now()-interval '30 days' AND status<>'sending'");
    await this.pool.query("DELETE FROM whatsapp_phone_challenges WHERE expires_at<now()-interval '1 day'");
  }
}
