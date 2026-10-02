# Ryvix Database Migration Validation

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
**Status**: VALIDATED & CANONICAL  

## 1. Migration Sequence & Canonical Source

The canonical PostgreSQL database schema is tracked in:
`supabase/migrations/`

1. `20260921000001_phase1_core_schema.sql`:
   - Provisions `organizations`, `organization_members`, `projects`, `environments`, `servers`, `tasks`, `plans`, and core RLS policies.
2. `20260921000002_complete_platform_schema.sql`:
   - Provisions `repository_installations`, `repositories`, `pull_requests`, `connectors`, `connector_credentials`, `connector_commands`, `health_checks`, `telemetry_metric_rollups`, `security_events`, `incidents`, `audit_events`.
3. `20260921000003_auth_lifecycle_enhancements.sql`:
   - Implements email OTP lifecycle, session tokens, audit logging triggers, and password reset hooks.

---

## 2. Foreign Key & Query Compatibility Resolution

### PostgREST Relationship Ambiguity (Resolved)
- **Problem**: `tasks` and `plans` had two competing foreign key constraints (`plans.task_id` referencing `tasks.id` AND `tasks.active_plan_id` referencing `plans.id`).
- **Impact**: Default PostgREST join `tasks?select=*,plans(*)` failed with `PGRST201: Could not embed because more than one relationship was found between 'tasks' and 'plans'`.
- **Validation**:
  All application queries now explicitly specify the relation path constraint:
  ```typescript
  supabase.from('tasks').select('*, plans:plans!plans_task_id_fkey(*)');
  ```
  Verified returning HTTP 200 with 9 real database tasks.
