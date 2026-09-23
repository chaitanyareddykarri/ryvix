# Ryvix Database Migration Validation

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
