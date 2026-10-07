import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { WorkspaceSession } from '@ryvix/database';
import type { ChangedFile } from '../../../services/src/workspace/task-artifacts';
import {ExperienceStore} from './experience-store';
import {ModelUsage} from './model-usage';

export interface RepositoryJob {
  task_id: string; repository_id: string; project_id: string; organization_id: string;
  created_by: string; user_prompt: string; full_name: string; default_branch: string;
}

export class RepositoryJobStore {
  constructor(private readonly pool: Pool, private readonly hostId?: string) {}
  async modelAttempt(job:RepositoryJob,workerId:string,event:import('../../../ai/src/model-attempt').ModelAttempt){
    await new ModelUsage(this.pool).record({org:job.organization_id,user:job.created_by,channel:'coding',source:job.task_id,claim:workerId},event);
  }
  async learningContext(job:RepositoryJob){
    const store=new ExperienceStore(this.pool);
    const lessons=await store.retrieve(job.organization_id,job.created_by,job.project_id,job.user_prompt);
    return lessons.map(l=>({id:l.id,content:l.content,evidenceId:l.event_id,observedAt:l.observed_at,expiresAt:l.expires_at}));
  }
  private workerHost() {
    if(!this.hostId || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(this.hostId))throw new Error('Stable worker host required');
    return this.hostId;
  }
  private async transaction<T>(fn: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const value = await fn(client); await client.query('COMMIT'); return value; }
    catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  }
  private async audit(client: PoolClient, project: string, actorId: string | null,
    actorType: 'user' | 'system', task: string, action: string, success = true) {
    await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
      VALUES($1,$2,$3,$4,$5,$6,$7)`, [project,actorId,actorType,action,
      createHash('sha256').update(task).digest('hex'),`Task ${task}`,success ? 'success' : 'failure']);
  }
  async enqueue(repositoryId: string, organizationId: string, userId: string, prompt: string) {
    return this.transaction(async client => {
      const repo = await client.query(`SELECT r.project_id FROM repositories r JOIN projects p ON p.id=r.project_id
        JOIN organization_members m ON m.organization_id=p.organization_id
        WHERE r.id=$1 AND p.organization_id=$2 AND m.user_id=$3 AND m.role IN ('owner','admin','developer')
        FOR SHARE OF m,r`, [repositoryId,organizationId,userId]);
      if (!repo.rows[0]) throw new Error('Repository access denied.');
      // A queued worker cannot use transient browser cookies.
      const credential = await client.query(`SELECT c.id FROM connectors c JOIN environments e ON e.id=c.environment_id
        JOIN connector_credentials cc ON cc.connector_id=c.id AND cc.credential_type='oauth_token'
        WHERE e.project_id=$1 AND c.connector_type='github' AND c.status='active'
        AND (cc.expires_at IS NULL OR cc.expires_at>now()) LIMIT 1`, [repo.rows[0].project_id]);
      if (!credential.rows[0]) throw new Error('Connect a persisted GitHub connection for this project before creating a task.');
      // Serialize admission per project to enforce a bounded queue under concurrency.
      await client.query('SELECT id FROM projects WHERE id=$1 FOR UPDATE', [repo.rows[0].project_id]);
      const count = await client.query(`SELECT count(*)::int AS count FROM repository_jobs j JOIN tasks t ON t.id=j.task_id
        WHERE t.project_id=$1 AND j.status IN ('queued','running')`, [repo.rows[0].project_id]);
      if (count.rows[0].count >= 10) throw new Error('Project task queue is full. Wait for a running task to finish.');
      const task = await client.query(`INSERT INTO tasks(project_id,created_by,channel,task_type,status,user_prompt)
        VALUES($1,$2,'web','coding','queued',$3) RETURNING id,status,user_prompt`, [repo.rows[0].project_id,userId,prompt]);
      await client.query('INSERT INTO repository_jobs(task_id,repository_id) VALUES($1,$2)', [task.rows[0].id,repositoryId]);
      await this.audit(client,repo.rows[0].project_id,userId,'user',task.rows[0].id,'task.enqueue');
      return task.rows[0];
    });
  }
  async claim(workerId: string): Promise<RepositoryJob | null> {
    const host=this.workerHost();
    return this.transaction(async client => {
      const result = await client.query(`SELECT j.task_id,j.repository_id,t.project_id,t.created_by,t.user_prompt,
        p.organization_id,r.full_name,r.default_branch FROM repository_jobs j
        JOIN tasks t ON t.id=j.task_id JOIN projects p ON p.id=t.project_id
        JOIN repositories r ON r.id=j.repository_id AND r.project_id=t.project_id
        WHERE j.status='queued' AND t.status='queued' ORDER BY j.created_at
        FOR UPDATE OF t,j SKIP LOCKED LIMIT 1`);
      const job = result.rows[0]; if (!job) return null;
      await client.query(`UPDATE repository_jobs SET status='running',worker_id=$2,worker_host_id=$3,lease_expires_at=now()+interval '45 seconds',updated_at=now() WHERE task_id=$1`, [job.task_id,workerId,host]);
      await client.query("UPDATE tasks SET status='planning',updated_at=now() WHERE id=$1", [job.task_id]);
      await this.audit(client,job.project_id,null,'system',job.task_id,'task.execute.requested');
      return job;
    });
  }
  async heartbeat(taskId: string, workerId: string) {
    const result = await this.pool.query(`UPDATE repository_jobs j SET lease_expires_at=now()+interval '45 seconds',updated_at=now()
      FROM tasks t WHERE j.task_id=$1 AND j.worker_id=$2 AND j.status='running' AND j.lease_expires_at>now()
      AND t.id=j.task_id AND t.status IN ('planning','executing','verifying') RETURNING j.task_id`, [taskId,workerId]);
    return result.rowCount === 1;
  }
  private async lock(client: PoolClient, job: RepositoryJob, workerId: string) {
    const valid = await client.query(`SELECT t.id FROM tasks t JOIN repository_jobs j ON j.task_id=t.id
      JOIN projects p ON p.id=t.project_id JOIN organization_members m ON m.organization_id=p.organization_id
      WHERE t.id=$1 AND j.worker_id=$2 AND j.status='running' AND j.lease_expires_at>now()
      AND t.status IN ('planning','executing','verifying') AND m.user_id=t.created_by
      AND m.role IN ('owner','admin','developer') FOR UPDATE OF t,j FOR SHARE OF m`, [job.task_id,workerId]);
    if (valid.rowCount !== 1) throw new Error('Task cancelled, lease lost or authorization revoked.');
  }
  async credentials(job: RepositoryJob, workerId: string): Promise<string> {
    return this.transaction(async client => {
      await this.lock(client,job,workerId);
      const result = await client.query(`SELECT secret.decrypted_secret FROM connectors c JOIN environments e ON e.id=c.environment_id
        JOIN connector_credentials cc ON cc.connector_id=c.id AND cc.credential_type='oauth_token'
        JOIN vault.decrypted_secrets secret ON secret.id::text=cc.vault_secret_ref
        WHERE e.project_id=$1 AND c.connector_type='github' AND c.status='active'
        AND (cc.expires_at IS NULL OR cc.expires_at>now()) ORDER BY c.updated_at DESC LIMIT 1`, [job.project_id]);
      if (!result.rows[0]?.decrypted_secret) throw new Error('Project GitHub credentials unavailable.');
      return result.rows[0].decrypted_secret;
    });
  }
  async session(job: RepositoryJob, workerId: string, session: WorkspaceSession) {
    return this.transaction(async client => {
      await this.lock(client,job,workerId);
      await client.query(`INSERT INTO workspace_sessions(id,task_id,project_id,container_id,status,preview_port,allocated_cpu,allocated_ram_mb,created_at,expires_at,worker_host_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [session.id,job.task_id,job.project_id,session.container_id,
        session.status,session.preview_port,session.allocated_cpu,session.allocated_ram_mb,session.created_at,session.expires_at,this.workerHost()]);
    });
  }
  async plan(job: RepositoryJob, workerId: string, summary: string, steps: string[]) {
    return this.transaction(async client => {
      await this.lock(client,job,workerId);
      const plan = await client.query(`INSERT INTO plans(task_id,steps,requires_approval) VALUES($1,$2::jsonb,true) RETURNING id`,
        [job.task_id,JSON.stringify(steps.map((description,i) => ({step_number:i+1,title:description,description,status:'planned',requires_approval:true})))]);
      await client.query("UPDATE tasks SET active_plan_id=$2,summary=$3,status='executing',updated_at=now() WHERE id=$1", [job.task_id,plan.rows[0].id,summary]);
    });
  }
  async complete(job: RepositoryJob, workerId: string, result: { session: WorkspaceSession; files: ChangedFile[]; baseSha: string; verification: unknown }) {
    return this.transaction(async client => {
      await this.lock(client,job,workerId);
      await client.query(`INSERT INTO task_artifacts(task_id,repository_id,base_commit_sha,base_branch,files,verification)
        VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb)`, [job.task_id,job.repository_id,result.baseSha,job.default_branch,JSON.stringify(result.files),JSON.stringify(result.verification)]);
      await client.query("UPDATE workspace_sessions SET status=$2,preview_url=$3 WHERE id=$1 AND task_id=$4", [result.session.id,result.session.status,result.session.preview_url,job.task_id]);
      await client.query("UPDATE tasks SET status='awaiting_approval',updated_at=now() WHERE id=$1", [job.task_id]);
      await client.query("UPDATE repository_jobs SET status='completed',lease_expires_at=NULL,updated_at=now() WHERE task_id=$1", [job.task_id]);
      await this.audit(client,job.project_id,null,'system',job.task_id,'task.execute.success');
    });
  }
  async fail(job: RepositoryJob, workerId: string, expiredOnly=false) {
    return this.transaction(async client => {
      const valid = await client.query(`SELECT t.status FROM tasks t JOIN repository_jobs j ON j.task_id=t.id
        WHERE t.id=$1 AND j.worker_id=$2 AND j.status='running'
          AND (NOT $3::boolean OR j.lease_expires_at<=now()) FOR UPDATE OF t,j`, [job.task_id,workerId,expiredOnly]);
      if (!valid.rows[0]) return;
      await client.query(`UPDATE tasks SET status='failed',error_details='Workspace execution interrupted or verification failed. No changes were shipped.',updated_at=now()
        WHERE id=$1 AND status IN ('planning','executing','verifying')`, [job.task_id]);
      await client.query("UPDATE repository_jobs SET status=$2,lease_expires_at=NULL,updated_at=now() WHERE task_id=$1", [job.task_id,valid.rows[0].status==='cancelled'?'cancelled':'failed']);
      await this.audit(client,job.project_id,null,'system',job.task_id,'task.execute.failure',false);
    });
  }
  async expireLeases() {
    const result = await this.pool.query(`SELECT j.task_id,j.worker_id,t.project_id,t.created_by FROM repository_jobs j
      JOIN tasks t ON t.id=j.task_id WHERE j.status='running' AND j.lease_expires_at<=now() LIMIT 100`);
    for (const row of result.rows) await this.fail(row, row.worker_id,true);
  }
  async previewSessions(): Promise<WorkspaceSession[]> {
    return (await this.pool.query("SELECT * FROM workspace_sessions WHERE worker_host_id=$1 AND status='active' AND preview_url IS NOT NULL AND expires_at>now() LIMIT 1000",[this.workerHost()])).rows;
  }
  async cleanupSessions(): Promise<WorkspaceSession[]> {
    return (await this.pool.query(`SELECT w.* FROM workspace_sessions w JOIN tasks t ON t.id=w.task_id
      WHERE w.worker_host_id=$1 AND w.status<>'destroyed' AND (w.expires_at<=now() OR t.status IN ('failed','cancelled')) LIMIT 100`,[this.workerHost()])).rows;
  }
  async markDestroyed(sessionId: string) {
    await this.transaction(async client => {
      const session = await client.query("UPDATE workspace_sessions SET status='destroyed',preview_url=NULL WHERE id=$1 AND worker_host_id=$2 AND status<>'destroyed' RETURNING project_id",[sessionId,this.workerHost()]);
      if (session.rows[0]) await client.query(`INSERT INTO audit_events(project_id,actor_type,action_name,parameters_hash,diff_summary,status)
        VALUES($1,'system','workspace.cleanup.success',$2,'Expired or stopped task workspace cleaned up.','success')`,
        [session.rows[0].project_id,createHash('sha256').update(sessionId).digest('hex')]);
    });
  }
}
