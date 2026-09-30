import { githubTokenForProject } from '@/utils/github-credentials';
import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { PullRequestService } from '../../../../../../backend/src/services/pr.service';
import { requireTenant, requireOperator, RequestError } from '@/utils/tenant-context';
import { getDirectDbPool } from '@/utils/direct-db';
import type { ChangedFile } from '../../../../../../services/src/workspace/task-artifacts';
import type { PoolClient } from 'pg';

export async function POST(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  let client: PoolClient | undefined;
  let auditScope: { projectId: string; userId: string; taskId: string } | undefined;
  try {
    const { user, organizationId, role } = await requireTenant();
    requireOperator(role);
    const { taskId } = await context.params;
    if (!/^[a-f0-9-]{36}$/i.test(taskId)) throw new RequestError('Invalid task identifier.', 400);
    const pool = getDirectDbPool();
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='5s'");
    const taskQuery = await client.query(`SELECT t.* FROM tasks t JOIN projects p ON p.id=t.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id
      WHERE t.id=$1 AND p.organization_id=$2 AND m.user_id=$3 AND m.role IN ('owner','admin','developer')
      FOR UPDATE OF t`, [taskId, organizationId, user.id]);
    const task = taskQuery.rows[0];
    if (!task) throw new RequestError('Task not found.', 404);
    const previous = await client.query(`SELECT pr.*, r.full_name FROM pull_requests pr
      JOIN repositories r ON r.id=pr.repository_id WHERE pr.task_id=$1`, [taskId]);
    if (previous.rows[0]) {
      const pr = previous.rows[0];
      await client.query('COMMIT');
      return NextResponse.json({ success: true, task: { id: taskId, status: task.status }, pullRequest: {
        number: pr.pr_number, url: pr.html_url, branch: pr.branch_name, commitSha: pr.commit_sha, repository: pr.full_name,
      } });
    }
    if (task.status !== 'awaiting_approval') throw new RequestError('Task is not ready for approval.', 409);
    auditScope = { projectId: task.project_id, userId: user.id, taskId };
    const token = await githubTokenForProject(task.project_id, organizationId, user.id, client);
    const artifactQuery = await client.query(`SELECT a.*,r.full_name FROM task_artifacts a
      JOIN repositories r ON r.id=a.repository_id WHERE a.task_id=$1 AND r.project_id=$2`, [taskId, task.project_id]);
    const artifact = artifactQuery.rows[0];
    if (!artifact?.files?.length) throw new RequestError('Diff not available.', 409);
    if (!task.active_plan_id) throw new RequestError('Persisted task plan unavailable.', 409);
    const approval = await client.query(`UPDATE plans SET approved_by=$2,approved_at=now()
      WHERE id=$1 AND task_id=$3 RETURNING id`, [task.active_plan_id, user.id, taskId]);
    if (!approval.rowCount) throw new RequestError('Plan unavailable.', 409);
    // Approval and intent must survive a later GitHub/network failure.
    await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
      VALUES($1,$2,'user','github.create_pr.requested',$3,$4,'success')`, [task.project_id,user.id,
      createHash('sha256').update(JSON.stringify({ taskId, base: artifact.base_commit_sha, files: artifact.files })).digest('hex'),
      `Approved plan ${approval.rows[0].id} for task ${taskId}`]);
    await client.query('COMMIT');
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='5s'");
    const current = await client.query(`SELECT t.id FROM tasks t JOIN projects p ON p.id=t.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id JOIN plans pl ON pl.id=t.active_plan_id
      WHERE t.id=$1 AND t.status='awaiting_approval' AND p.organization_id=$2 AND m.user_id=$3
      AND m.role IN ('owner','admin','developer') AND pl.approved_by=$3 AND pl.id=$4
      FOR UPDATE OF t`, [taskId,organizationId,user.id,approval.rows[0].id]);
    if (current.rowCount !== 1) throw new RequestError('Task changed or access was revoked. Reload before shipping.',409);
    const pr = await PullRequestService.createPullRequest({
      taskId, repositoryId: artifact.repository_id, repoUrl: artifact.full_name,
      taskPrompt: task.user_prompt, title: task.summary || task.user_prompt.slice(0, 120),
      baseBranch: artifact.base_branch, expectedBaseSha: artifact.base_commit_sha,
      branchName: `ryvix/task-${taskId}`, githubToken: token,
      changes: artifact.files.map((file: ChangedFile) => ({ path: file.filename, action: file.action, content: file.content })),
      authorization: { actorId: user.id, approvalId: approval.rows[0].id,
        recordAudit: async event => {
          if (event.status === 'requested') return; // Already committed before any GitHub write.
          await client!.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
            VALUES($1,$2,'user',$3,$4,$5,$6)`, [task.project_id, user.id, `${event.action}.${event.status}`,
            createHash('sha256').update(JSON.stringify({ taskId, base: artifact.base_commit_sha, files: artifact.files })).digest('hex'),
            event.detail || `Task ${taskId} PR request`, event.status === 'failure' ? 'failure' : 'success']);
        } },
    });
    await client.query(`INSERT INTO pull_requests(repository_id,task_id,pr_number,branch_name,title,status,html_url,commit_sha)
      VALUES($1,$2,$3,$4,$5,'open',$6,$7)`, [artifact.repository_id, taskId, pr.prNumber, pr.branchName, pr.title, pr.prUrl, pr.commitSha]);
    await client.query("UPDATE tasks SET status='completed',updated_at=now() WHERE id=$1", [taskId]);
    await client.query('COMMIT');
    return NextResponse.json({ success: true, task: { id: taskId, status: 'completed' }, pullRequest: {
      number: pr.prNumber, url: pr.prUrl, branch: pr.branchName, commitSha: pr.commitSha, repository: artifact.full_name,
    } });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (client && auditScope) await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
      VALUES($1,$2,'user','task.ship.failure',$3,'PR shipping did not complete; task state preserved.','failure')`,
      [auditScope.projectId, auditScope.userId, createHash('sha256').update(auditScope.taskId).digest('hex')]).catch(() => {});
    const safe = error instanceof RequestError || (error instanceof Error && /^(GitHub |Repository changed|Working branch)/.test(error.message));
    return NextResponse.json({ error: safe ? (error as Error).message : 'Shipping failed. Task state was preserved; retry to reconcile any GitHub PR already created.' },
      { status: error instanceof RequestError ? error.status : 502 });
  } finally { client?.release(); }
}
