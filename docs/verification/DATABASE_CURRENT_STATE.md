# Step 1: Database Current State & Gap Audit

## 1. Executive Summary

This document captures the empirical audit of the Ryvix database as of **Phase 0/1 Pre-Migration**. 

### Critical Findings:
1. **Live Supabase Status**: **UNTOUCHED**. No migrations have been applied to the live hosted Supabase instance (`tsoyrpgifovzwqtgpkkb`).
2. **Current Local Migration**: [`supabase/migrations/20260921000001_phase1_core_schema.sql`](../../supabase/migrations/20260921000001_phase1_core_schema.sql) only defines the initial 6 tables:
   - `organizations`
   - `profiles`
   - `projects`
   - `tasks`
   - `plans`
   - `audit_events`
3. **Architectural Gap**: The existing 6 tables only support basic task planning. They completely omit:
   - Multi-user organization memberships and API keys.
   - Explicit environments (`production`, `staging`, `development`).
   - GitHub repositories, installations, and pull requests.
   - AI model providers, model runs, and token accounting.
   - Normalized plan steps and tool execution logging.
   - Generic connectors, in-band server daemons, and cloud hypervisor probes.
   - Server inventory and running service tracking.
   - Ephemeral coding workspaces, build/test runs, and preview sessions.
   - Security events, detection rules, and attack forensics.
   - Incidents, recovery plans, anti-looping recovery runs, and verification.
   - Health checks, external availability probes, and metric rollups.
   - Multi-channel notification delivery tracking.

---

## 2. Detailed Audit of Existing Schema (`20260921000001_phase1_core_schema.sql`)

### Tables Currently Defined:
1. **`public.organizations`**:
   - Columns: `id` (UUID, PK), `name` (TEXT), `slug` (TEXT, UNIQUE), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
   - Deficiencies: No subscription tier, no organization settings, no member seat limits.
2. **`public.profiles`**:
   - Columns: `id` (UUID, PK -> `auth.users`), `organization_id` (UUID, FK -> `organizations`), `full_name`, `avatar_url`, `phone_number`, `role` (`'owner' | 'admin' | 'developer' | 'viewer'`), `created_at`, `updated_at`.
   - Deficiencies: Tight 1:1 binding to a single organization. Does not support users belonging to multiple organizations.
3. **`public.projects`**:
   - Columns: `id` (UUID, PK), `organization_id` (UUID, FK -> `organizations`), `name`, `slug`, `environment` (`'production' | 'staging' | 'development'`), `metadata` (JSONB), `created_at`, `updated_at`.
   - Deficiencies: Environment is a flat string enum instead of a discrete entity; tech stack, build, and test settings are dumped into unstructured `metadata` JSONB.
4. **`public.tasks`**:
   - Columns: `id` (UUID, PK), `project_id` (UUID, FK -> `projects`), `created_by` (UUID, FK -> `auth.users`), `channel` (`'web' | 'whatsapp' | 'gmail'`), `task_type` (`'coding' | 'investigation' | 'operational' | 'recovery' | 'preview'`), `status`, `user_prompt`, `active_plan_id`, `summary`, `error_details`, `created_at`, `updated_at`.
   - Deficiencies: No priority column, no timeout timestamp, no environment link, no parent task pointer for subtasks.
5. **`public.plans`**:
   - Columns: `id` (UUID, PK), `task_id` (UUID, FK -> `tasks`), `version` (INT), `steps` (JSONB), `requires_approval` (BOOLEAN), `approved_by` (UUID), `approved_at`, `created_at`.
   - Deficiencies: Steps are trapped in an un-indexed JSONB array; no relational `plan_steps` table exists for step-by-step progress, retry, or tool tracking.
6. **`public.audit_events`**:
   - Columns: `id` (UUID, PK), `timestamp` (TIMESTAMPTZ), `project_id` (UUID, FK -> `projects`), `actor_id` (UUID), `actor_type` (`'user' | 'ai' | 'system'`), `action_name`, `parameters_hash`, `diff_summary`, `status`, `ip_address`.
   - Deficiencies: Missing target entity, target ID, organization ID, and correlation IDs.

---

## 3. Codebase Usage & Dependency Inventory

| Subsystem File | Database Entities Referenced | Current Query Pattern |
| :--- | :--- | :--- |
| **`packages/database/src/client.ts`** | Supabase JS Client Factory | Provides `createServerDatabaseClient()` and `createPublicDatabaseClient()`. |
| **`packages/database/src/types.ts`** | `Organization`, `Profile`, `Project`, `Task`, `Plan`, `AuditEvent`, `PlanStep` | Static TypeScript interfaces matching Phase 1 schema. |
| **`backend/src/db.ts`** | Server Supabase Client | Singleton instance via `getBackendDatabaseClient()`. |
| **`backend/src/repositories/task.repository.ts`** | `tasks`, `plans` | `findById()`, `createTask()`, `findByProjectId()`, `updateStatus()`, `savePlan()`. |
| **`backend/src/repositories/audit.repository.ts`**| `audit_events` | `recordEvent()`, `findByProjectId()`. |
| **`backend/src/tools/task-tools.ts`** | `tasks`, `audit_events` | Enforces project tenant checks on tool execution. |
| **`backend/src/connectors/gmail.connector.ts`** | `profiles`, `projects`, `tasks`, `audit_events` | Enqueues incoming email tasks and logs interactions. |
| **`ai/src/orchestrator.ts`** | None (Direct) | Consumes only typed transfer objects (`PlanStep`). Zero direct DB access. |
| **`web/utils/supabase/server.ts`** | Supabase Auth Sessions | Reads/writes SSR session cookies. |
| **`web/app/login/page.tsx`** | Supabase Auth OTP | `supabase.auth.signInWithOtp()`, `supabase.auth.verifyOtp()`. |

---

## 4. Complete Domain Inventory Required for Full Production

To support the real Ryvix platform without future breaking changes, the following 12 core domains and their respective tables are required:

1. **Identity & Multi-Tenancy**: `organizations`, `profiles`, `organization_memberships`, `api_keys`.
2. **Projects & Environments**: `projects`, `environments`.
3. **Version Control & GitHub**: `repository_installations`, `repositories`, `pull_requests`.
4. **AI & Model Providers**: `model_providers`, `ai_model_runs`.
5. **Tasks, Plans & Tools**: `tasks`, `plans`, `plan_steps`, `tool_calls`.
6. **Connectors & Command Queue**: `connectors`, `connector_capabilities`, `connector_credentials`, `connector_commands`.
7. **Customer Server Infrastructure**: `servers`, `services_inventory`, `server_heartbeats`.
8. **Observability & Telemetry**: `telemetry_metric_rollups` (1m/5m rollups), `health_checks`, `health_check_events`.
9. **Coding Sandboxes & Previews**: `workspace_profiles`, `workspace_sessions`, `build_runs`, `preview_sessions`.
10. **Incidents & Threat Detection**: `security_events`, `detection_rules`, `incidents`.
11. **Autonomous Self-Healing**: `recovery_plans`, `recovery_actions`, `recovery_runs`.
12. **Human Approvals, Notifications & Audit**: `approval_requests`, `notifications`, `audit_events`.
