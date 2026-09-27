import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OperationAuthorization } from '../../backend/src/services/operation-authorization';

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
    const { error } = await db.from('audit_events').insert({
      project_id: projectId, actor_id: userId, actor_type: 'user',
      action_name: `${event.action}.${event.status}`, parameters_hash: createHash('sha256').update(JSON.stringify({ target: event.target, approvalId })).digest('hex'),
      diff_summary: JSON.stringify({ approvalId, target: event.target, detail: event.detail }),
      status: event.status === 'failure' ? 'failure' : 'success', ip_address: null,
    });
    if (error) throw new Error('Audit write failed; operation cannot be reported as successful');
  } };
}
