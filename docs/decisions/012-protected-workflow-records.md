# ADR-012: Protect workflow records from direct browser writes

The browser may edit only profile display fields, not its organization or role.
Membership remains authoritative. Profile SELECT no longer recursively queries
its own RLS policy: a narrowly scoped SECURITY DEFINER helper resolves only the
current authenticated user's persisted organization and membership.

Tasks, plans, approvals, workspaces and PR records are written by authenticated
backend services through existing privileged database access, never directly by
the browser. Revoke browser mutations to prevent bypassing lifecycle and approval
routes through PostgREST. Existing SELECT policies remain active.

Apply migration 20260930000003 and verify with real viewer/developer/owner JWTs.
This is not a certification of every historical RLS policy in the schema.
