import { taskRepository } from '../repositories/task.repository';
import { auditRepository } from '../repositories/audit.repository';
import type { Task } from '@ryvix/database';

export interface ToolSecurityContext {
  userId: string;
  projectId: string;
  userRole: 'owner' | 'admin' | 'developer' | 'viewer';
  sourceChannel: 'web' | 'whatsapp' | 'gmail';
}

/**
 * Controlled Backend Tool Execution Layer
 * 
 * Demonstrates the mandatory security mediation pattern:
 * AI requests a tool -> Backend checks Auth & Permissions -> Specific DB query runs.
 * The AI Model never has direct database access.
 */
export async function handleAIToolGetTaskStatus(
  taskId: string,
  context: ToolSecurityContext
): Promise<{ success: boolean; data?: Task; error?: string }> {
  // 1. Authentication & Project authorization check
  if (!context.userId || !context.projectId) {
    return { success: false, error: 'Unauthorized: Missing user or project context.' };
  }

  // 2. Fetch task via repository
  const task = await taskRepository.findById(taskId);
  if (!task) {
    return { success: false, error: 'Task not found.' };
  }

  // 3. Multi-tenancy check: Does task belong to user's authorized project?
  if (task.project_id !== context.projectId) {
    return { success: false, error: 'Access denied: Project mismatch.' };
  }

  // 4. Log tool access to immutable audit ledger
  await auditRepository.recordEvent({
    project_id: context.projectId,
    actor_id: context.userId,
    actor_type: 'ai',
    action_name: 'tool.task.get_status',
    parameters_hash: `task_${taskId}`,
    diff_summary: null,
    status: 'success',
    ip_address: null,
  });

  // 5. Return sanitized data to AI reasoning loop
  return { success: true, data: task };
}
