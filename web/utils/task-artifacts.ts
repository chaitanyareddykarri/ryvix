import 'server-only';
import { getDirectDbPool } from './direct-db';
import type { ChangedFile } from '../../services/src/workspace/task-artifacts';

/** Backend-only write. Tenant/project/repository linkage is checked in the write itself. */
export async function persistTaskArtifacts(input: {
  taskId: string; repositoryId: string; userId: string; organizationId: string;
  baseCommitSha: string; baseBranch: string; files: ChangedFile[];
  verification: Array<{ command: string; success: boolean; exitCode: number; durationMs: number }>;
}) {
  if (!/^[a-f0-9]{40,64}$/.test(input.baseCommitSha) || !input.files.length) throw new Error('A repository revision and actual patch are required');
  const db = await getDirectDbPool().connect();
  try {
    await db.query('BEGIN');
    const task = await db.query(`SELECT t.id FROM tasks t JOIN projects p ON p.id=t.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id
      JOIN repositories r ON r.project_id=p.id AND r.id=$2
      WHERE t.id=$1 AND m.user_id=$3 AND p.organization_id=$4
      AND m.role IN ('owner','admin','developer') AND t.status IN ('planning','executing','verifying')
      FOR UPDATE OF t`, [input.taskId, input.repositoryId, input.userId, input.organizationId]);
    if (task.rowCount !== 1) throw new Error('Task is unavailable or not accepting generated changes');
    await db.query(`INSERT INTO task_artifacts(task_id,repository_id,base_commit_sha,base_branch,files,verification)
      VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb)`, [input.taskId, input.repositoryId,
      input.baseCommitSha, input.baseBranch, JSON.stringify(input.files), JSON.stringify(input.verification)]);
    await db.query(`UPDATE tasks SET status='awaiting_approval',updated_at=now() WHERE id=$1`, [input.taskId]);
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}
