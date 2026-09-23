# Ryvix Row-Level Security (RLS) Policy Review

**Date**: September 23, 2026  
**Status**: AUDITED & SECURE  

## 1. Scope of Review
All PostgreSQL tables in the Supabase database were audited for Row-Level Security (RLS) enforcement and multi-tenant isolation.

---

## 2. Table-by-Table Policy Audit

| Table Name | RLS Enabled | Tenant Isolation Key | Policy Definition / Enforced Behavior |
| :--- | :--- | :--- | :--- |
| `public.organizations` | YES | `id` | Members can only read/write their active organization. |
| `public.profiles` | YES | `id` (= auth.uid()) | Users can only inspect and modify their own profile row. |
| `public.projects` | YES | `organization_id` | Scoped via member check: `organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())`. |
| `public.repositories` | YES | `project_id` | Scoped through project ownership to authenticated tenant. |
| `public.repository_installations` | YES | `organization_id` | Only members of the organization can view or connect repositories. |
| `public.servers` | YES | `environment_id` | Enforced through environment -> project -> organization hierarchy. |
| `public.connectors` | YES | `environment_id` | Connector credentials and registration restricted to tenant environment. |
| `public.health_checks` | YES | `server_id` | Health check history accessible only to server owners. |
| `public.telemetry_metric_rollups` | YES | `server_id` | Read-only rollup stream scoped by tenant server. |
| `public.security_events` | YES | `server_id` | Intrusion alerts and threat scores partitioned by server owner. |
| `public.audit_events` | YES | `organization_id` | Append-only audit trail scoped to tenant organization. |

---

## 3. Cross-Tenant Isolation Guarantee
- **Zero Cross-Tenant Leakage**: Tested and verified in `tests/cross-tenant-rls.test.ts`. An authenticated user from Organization A querying Organization B's servers, tasks, or repositories receives zero rows (`[]`) or HTTP 403 Forbidden.
- **Service-Role Boundary**: Service-role keys are never exposed to client browsers or AI model prompts; all client requests authenticate via signed Supabase Auth JWT cookies.
