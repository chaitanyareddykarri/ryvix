import 'server-only';
import { cookies } from 'next/headers';
import { createClient } from './supabase/server';

export class RequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

/** Resolve identity from the verified session, then verify persisted membership. */
export async function requireTenant() {
  const db = createClient(await cookies());
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) throw new RequestError('Authentication required.', 401);
  const { data: profile, error: profileError } = await db.from('profiles')
    .select('organization_id').eq('id', user.id).single();
  if (profileError || !profile?.organization_id) throw new RequestError('Organization unavailable.', 403);
  const { data: member, error } = await db.from('organization_members')
    .select('role').eq('user_id', user.id).eq('organization_id', profile.organization_id).single();
  if (error || !member) throw new RequestError('Organization access denied.', 403);
  return { db, user, organizationId: profile.organization_id as string, role: member.role as string };
}

export function requireOperator(role: string) {
  if (!['owner', 'admin', 'developer'].includes(role)) throw new RequestError('Operator permission required.', 403);
}
