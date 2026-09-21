import { createServerDatabaseClient } from '@ryvix/database';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Backend Database Client Provider
 * 
 * SECURITY BOUNDARY:
 * This client runs strictly in server-side Node.js processes.
 * It is never bundled into client applications or shared with the AI Model.
 * All database operations performed by this client are gated by backend
 * authentication, RBAC, and policy checks.
 */
let dbInstance: SupabaseClient | null = null;

export function getBackendDatabaseClient(): SupabaseClient {
  if (!dbInstance) {
    dbInstance = createServerDatabaseClient();
  }
  return dbInstance;
}

export const db = getBackendDatabaseClient();
