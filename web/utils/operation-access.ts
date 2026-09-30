import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OperationAuthorization } from '../../backend/src/services/operation-authorization';
import { getDirectDbPool } from './direct-db';

export async function requireProjectOperator(db: SupabaseClient, userId: string, projectId: string) {
  const { data: project, error } = await db.from('projects').select('id, organization_id').eq('id', projectId).maybeSingle();
  if (error || !project) throw new Error('Project access denied');
  const { data: member, error: memberError } = await db.from('organization_members').select('role')
    .eq('organization_id', project.organization_id).eq('user_id', userId).maybeSingle();
  if (memberError || !member || !['owner', 'admin', 'developer'].includes(member.role)) throw new Error('Project operation denied');
  return member.role as string;
}

export function operationAuthorization(db: SupabaseClient, userId: string, projectId: string): OperationAuthorization {
  const approvalId = randomUUID();
  return { actorId: userId, approvalId, recordAudit: async event => {
    await requireProjectOperator(db,userId,projectId);
    const client = await getDirectDbPool().connect();
    try {
      await client.query('BEGIN');
      const permission = await client.query(`SELECT m.role FROM projects p
        JOIN organization_members m ON m.organization_id=p.organization_id
        WHERE p.id=$1 AND m.user_id=$2 AND m.role IN ('owner','admin','developer') FOR SHARE OF m`,[projectId,userId]);
      if (!permission.rows[0]) throw new Error('Project operation denied');
      await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
        VALUES($1,$2,'user',$3,$4,$5,$6)`,[projectId,userId,`${event.action}.${event.status}`,
        createHash('sha256').update(JSON.stringify({target:event.target,approvalId})).digest('hex'),
        JSON.stringify({approvalId,target:event.target,detail:event.detail}),event.status==='failure'?'failure':'success']);
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK').catch(()=>{});
      throw new Error('Audit write or authorization failed; operation cannot be reported as successful');
    } finally {client.release();}
  } };
}
