import { db } from '../db';
import type { Task, Plan, TaskStatus } from '@ryvix/database';

/**
 * Task Repository
 * Centralized data access layer for Tasks and Plans in Supabase.
 * Executed exclusively by authorized backend services.
 */
export class TaskRepository {
  async findById(taskId: string): Promise<Task | null> {
    const { data, error } = await db
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) return null;
    return data as Task;
  }

  async createTask(task: {
    project_id: string;
    created_by: string;
    channel: 'web' | 'whatsapp' | 'gmail';
    task_type: Task['task_type'];
    user_prompt: string;
    status?: TaskStatus;
  }): Promise<Task | null> {
    const { data, error } = await db
      .from('tasks')
      .insert({
        project_id: task.project_id,
        created_by: task.created_by,
        channel: task.channel,
        task_type: task.task_type,
        user_prompt: task.user_prompt,
        status: task.status || 'queued',
      })
      .select('*')
      .single();

    if (error) return null;
    return data as Task;
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    const { data, error } = await db
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data as Task[];
  }

  async updateStatus(taskId: string, status: TaskStatus): Promise<boolean> {
    const { error } = await db
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    return !error;
  }

  async savePlan(plan: Omit<Plan, 'id' | 'created_at'>): Promise<string | null> {
    const { data, error } = await db
      .from('plans')
      .insert(plan)
      .select('id')
      .single();

    if (error) return null;
    return data.id;
  }
}

export const taskRepository = new TaskRepository();
