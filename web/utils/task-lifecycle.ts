import 'server-only';
import { createHash } from 'node:crypto';
import { getDirectDbPool } from './direct-db';
import { RequestError } from './tenant-context';
import type { WorkspaceSession } from '@ryvix/database';

/** Lock the same task row used by PR shipping and artifact writes. */
export async function changeTaskLifecycle(taskId: string, action: 'cancel' | 'delete', userId: string, organizationId: string) {
  if (!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(taskId)) throw new RequestError('Invalid task identifier.', 400);
  const client = await getDirectDbPool().connect();
  let sessions: WorkspaceSession[] = [];
  let projectId: string;
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='5s'");
    const result = await client.query(`SELECT t.id,t.project_id,t.status FROM tasks t
      JOIN projects p ON p.id=t.project_id JOIN organization_members m ON m.organization_id=p.organization_id
      WHERE t.id=$1 AND t.created_by=$2 AND p.organization_id=$3 AND m.user_id=$2
      AND m.role IN ('owner','admin','developer') FOR UPDATE OF t`, [taskId,userId,organizationId]);
    const task = result.rows[0];
    if (!task) throw new RequestError('Task not found.', 404);
    projectId = task.project_id;
    if (action === 'cancel' && task.status === 'completed') throw new RequestError('Completed tasks cannot be cancelled.', 409);
    if (action === 'delete' && !['failed','cancelled','completed'].includes(task.status))
      throw new RequestError('Cancel the task before deleting it.', 409);
    sessions = (await client.query(`SELECT * FROM workspace_sessions WHERE task_id=$1 AND status<>'destroyed'`, [taskId])).rows;
    // The owning Docker worker performs cleanup. Keep these rows until it confirms destruction.
    await client.query("UPDATE workspace_sessions SET expires_at=LEAST(expires_at,now()),preview_url=NULL WHERE task_id=$1 AND status<>'destroyed'", [taskId]);
    // Cancellation is durable before cleanup, so in-flight workers cannot publish artifacts.
    if (action === 'cancel') {
      await client.query("UPDATE tasks SET status='cancelled',updated_at=now() WHERE id=$1", [taskId]);
      await client.query("UPDATE repository_jobs SET status='cancelled',lease_expires_at=NULL,updated_at=now() WHERE task_id=$1 AND status IN ('queued','running')", [taskId]);
    }
    await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
      VALUES($1,$2,'user',$3,$4,$5,'success')`, [projectId,userId,`task.${action}.requested`,
      createHash('sha256').update(taskId).digest('hex'), `Task ${taskId}`]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }

  if (action === 'delete' && sessions.length) {
    throw new RequestError('Workspace cleanup is pending. Retry deletion after the worker finishes cleanup.', 409);
  }
  const finish = await getDirectDbPool().connect();
  try {
    await finish.query('BEGIN');
    if (action === 'delete') {
      const removed = await finish.query(`DELETE FROM tasks t USING projects p,organization_members m
        WHERE t.id=$1 AND t.created_by=$2 AND t.project_id=p.id AND p.organization_id=$3
        AND m.organization_id=p.organization_id AND m.user_id=$2 AND m.role IN ('owner','admin','developer')
        AND t.status IN ('failed','cancelled','completed')
        AND NOT EXISTS (SELECT 1 FROM workspace_sessions w WHERE w.task_id=t.id AND w.status<>'destroyed')
        RETURNING t.id`, [taskId,userId,organizationId]);
      if (removed.rowCount !== 1) throw new RequestError('Task changed or access was revoked. Reload and retry.', 409);
    }
    await finish.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
      VALUES($1,$2,'user',$3,$4,$5,'success')`, [projectId!,userId,`task.${action}.success`,
      createHash('sha256').update(taskId).digest('hex'), `Task ${taskId}; ${action === 'cancel' ? 'cancellation recorded; worker cleanup requested' : 'deleted after workspace cleanup'}`]);
    await finish.query('COMMIT');
  } catch (error) { await finish.query('ROLLBACK').catch(() => {}); throw error; }
  finally { finish.release(); }
}
