# Ryvix Row-Level Security (RLS) Policy Review

## Historical checkpoint — 2026-10-02

This report is retained as evidence of its original inspection or test run.
The latest implementation checkpoint is `45b130b`: cloud recovery, WhatsApp P1
dispatch, security email and approved releases are implemented in that checkpoint.
The latest recorded schema is `20261002000003`; provider acceptance is still pending.

See the [current project status](../PROJECT_STATUS.md) for the
implemented scope, migration checkpoint, verification evidence and remaining work.
Results and pending lists below describe the original checkpoint; later changes
are recorded in the status index. Historical counts are intentionally preserved.


**Date**: September 23, 2026  
**Status**: Historical review; see current evidence and limitations below.

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
- **Current evidence and limits**: `tests/tenant-predicate.test.ts` is a JavaScript predicate unit test, not PostgreSQL RLS evidence. See `COMPLETION_2026_09_30.md` for current live catalog checks and rolled-back SQL role fixtures. Provider-issued JWT/browser isolation remains unverified.
- **Service-Role Boundary**: Service-role keys are never exposed to client browsers or AI model prompts; all client requests authenticate via signed Supabase Auth JWT cookies.
