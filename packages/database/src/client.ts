import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DatabaseConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
}

/**
 * Creates a server-side Supabase client for authorized Backend and Worker services.
 * 
 * CRITICAL SECURITY INVARIANT:
 * - This function is SERVER-ONLY and must NEVER be imported by frontend or client code.
 * - This client is NEVER provided to the AI Model.
 * - The AI Model interacts with data exclusively through the Backend Tool Layer.
 * - Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or fallback publishable key for dev).
 */
export function createServerDatabaseClient(config?: DatabaseConfig): SupabaseClient {
  // Disallow execution in browser environments
  if (typeof window !== 'undefined') {
    throw new Error('FATAL: createServerDatabaseClient cannot be invoked in a browser environment.');
  }

  const url = config?.supabaseUrl || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = config?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase server configuration. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are defined in your server environment.'
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Creates a standard public Supabase client.
 * For client-safe reads respecting Row Level Security (RLS) with active JWTs.
 */
export function createPublicDatabaseClient(config?: DatabaseConfig): SupabaseClient {
  const url = config?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = config?.supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase public configuration.');
  }

  return createClient(url, key);
}
