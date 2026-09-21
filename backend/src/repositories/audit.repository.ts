import { db } from '../db';
import type { AuditEvent } from '@ryvix/database';

/**
 * Audit Repository
 * Centralized, append-only persistence layer for immutable audit logs in Supabase.
 */
export class AuditRepository {
  async recordEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const { error } = await db.from('audit_events').insert({
      ...event,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to append to audit log:', error);
      throw new Error('Audit log write failure: Operations must be auditable.');
    }
  }

  async getEventsForProject(projectId: string, limit = 50): Promise<AuditEvent[]> {
    const { data, error } = await db
      .from('audit_events')
      .select('*')
      .eq('project_id', projectId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data as AuditEvent[];
  }
}

export const auditRepository = new AuditRepository();
