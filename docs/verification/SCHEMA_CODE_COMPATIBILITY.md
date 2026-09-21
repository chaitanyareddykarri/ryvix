# Database Schema vs. Application Code Compatibility Analysis

This document cross-references the Phase 1 PostgreSQL migration ([`supabase/migrations/20260921000001_phase1_core_schema.sql`](../../supabase/migrations/20260921000001_phase1_core_schema.sql)) with the application code and type contracts.

---

## 1. Table-by-Table Alignment Matrix

| Table Name (PostgreSQL) | TypeScript Interface (`packages/database/src/types.ts`) | Application Code Reference | Status | Compatibility Notes |
| :--- | :--- | :--- | :--- | :--- |
| `public.organizations` | `Organization` | Database schema & types | **COMPATIBLE** | Matches 1:1 (`id`, `name`, `slug`, timestamps). |
| `public.profiles` | `Profile` | Database schema & types | **COMPATIBLE** | Matches 1:1 (`id -> auth.users`, `role` enum check). |
| `public.projects` | `Project` | Database schema & types | **COMPATIBLE** | Matches 1:1 (`metadata JSONB` maps to typed object). |
| `public.tasks` | `Task` | `backend/src/repositories/task.repository.ts` | **COMPATIBLE** | All columns matched; status checks aligned. |
| `public.plans` | `Plan` | `backend/src/repositories/task.repository.ts` | **COMPATIBLE** | Steps stored as `JSONB` array in Postgres. |
| `public.audit_events` | `AuditEvent` | `backend/src/repositories/audit.repository.ts` | **COMPATIBLE** | Columns matched; immutability enforced. |

---

## 2. Identified Schema Optimizations Required Prior to Migration

### A. Missing Foreign Key & Performance Indexes
* **Issue**: Foreign keys (`tasks.project_id`, `tasks.created_by`, `plans.task_id`, `audit_events.project_id`, `audit_events.timestamp`) are unindexed in the initial migration script.
* **Impact**: As tasks and audit records grow, tenant-isolated lookups will incur sequential table scans.
* **Resolution**: Add explicit composite/B-tree indexes in `20260921000001_phase1_core_schema.sql`.

### B. Missing Automatic `updated_at` Trigger
* **Issue**: `organizations`, `profiles`, `projects`, and `tasks` define `updated_at TIMESTAMPTZ DEFAULT NOW()`, but updating a row does not automatically refresh the timestamp without an explicit PostgreSQL trigger.
* **Resolution**: Add `public.set_updated_at()` trigger function and attach triggers to all 4 tables in the migration.

### C. Type Alignment on Plan Steps
* **Issue**: `types.ts` defines `Plan.steps` with `status: 'pending'|'in_progress'|'completed'|'failed'`, while `ai/src/orchestrator.ts` generates steps with `requiresApproval` and `suggestedTool`.
* **Resolution**: Ensure `PlanStep` type in `types.ts` supports both execution state (`status`) and AI planning metadata (`suggested_tool`, `requires_approval`).
