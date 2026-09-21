# Ryvix Database Data Model & Entity Specifications

## 1. Relational Architecture & Database Engine

Ryvix uses **one centralized Supabase PostgreSQL database** as its unified relational datastore. The schema is organized into phased domain modules with strict referential integrity, cascading foreign keys, multi-tenant isolation, and version-controlled migrations in `supabase/migrations/`.

---

## 2. Phased Entity Rollout Strategy

To prevent premature schema inflation, Ryvix delineates between **Phase 1 Core Entities** (active in the initial migration) and **Future Phase Entities** (scheduled for implementation in subsequent phases):

```
+-----------------------------------------------------------------------------------+
|                        PHASE 1 CORE ENTITIES (ACTIVE)                             |
|                                                                                   |
|  organizations <── profiles (linked to auth.users)                                |
|        │                                                                          |
|        └──> projects                                                              |
|                 │                                                                 |
|                 ├──> tasks <── plans                                              |
|                 └──> audit_events (Immutable Ledger)                              |
+-----------------------------------------------------------------------------------+
                                          │
                                          v
+-----------------------------------------------------------------------------------+
|                        FUTURE PHASE ENTITIES (DOCUMENTED)                         |
|                                                                                   |
|  Phase 3 (GitHub):       repositories, repository_connections, connected_accounts |
|  Phase 4 (AI Engine):    model_runs, tool_calls                                   |
|  Phase 5 (Workspaces):   workspaces, modifications, builds, tests, previews       |
|  Phase 6-7 (Connectors): server_connectors, connector_permissions                 |
|  Phase 8 (Security):     security_events, detections, alerts, investigations      |
|  Phase 9 (Comm):         communication_metadata                                   |
|  Phase 10 (Deploy):      deployments                                              |
+-----------------------------------------------------------------------------------+
```

---

## 3. Phase 1 Core Entities (Implemented in `supabase/migrations/`)

These tables are defined in [`supabase/migrations/20260921000001_phase1_core_schema.sql`](../../supabase/migrations/20260921000001_phase1_core_schema.sql):

### 3.1 `organizations`
- `id` (UUID, PK)
- `name` (TEXT)
- `slug` (TEXT, UNIQUE)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.2 `profiles`
- `id` (UUID, PK, references `auth.users`)
- `organization_id` (UUID, FK -> `organizations.id`)
- `full_name`, `avatar_url`, `phone_number` (TEXT)
- `role` (TEXT: `'owner' | 'admin' | 'developer' | 'viewer'`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.3 `projects`
- `id` (UUID, PK)
- `organization_id` (UUID, FK -> `organizations.id`)
- `name` (TEXT)
- `slug` (TEXT)
- `environment` (TEXT: `'production' | 'staging' | 'development'`)
- `metadata` (JSONB)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- *Constraint*: UNIQUE (`organization_id`, `slug`)

### 3.4 `tasks`
- `id` (UUID, PK)
- `project_id` (UUID, FK -> `projects.id`)
- `created_by` (UUID, FK -> `auth.users`)
- `channel` (TEXT: `'web' | 'whatsapp' | 'gmail'`)
- `task_type` (TEXT: `'coding' | 'investigation' | 'operational' | 'recovery' | 'preview'`)
- `status` (TEXT: `'queued' | 'planning' | 'awaiting_approval' | 'executing' | 'verifying' | 'completed' | 'failed' | 'cancelled'`)
- `user_prompt` (TEXT)
- `active_plan_id` (UUID, FK -> `plans.id`)
- `summary`, `error_details` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.5 `plans`
- `id` (UUID, PK)
- `task_id` (UUID, FK -> `tasks.id`)
- `version` (INTEGER)
- `steps` (JSONB)
- `requires_approval` (BOOLEAN)
- `approved_by` (UUID, FK -> `auth.users`)
- `approved_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)

### 3.6 `audit_events`
- `id` (UUID, PK)
- `timestamp` (TIMESTAMPTZ)
- `project_id` (UUID, FK -> `projects.id`)
- `actor_id` (UUID, FK -> `auth.users`)
- `actor_type` (TEXT: `'user' | 'ai' | 'system'`)
- `action_name` (TEXT)
- `parameters_hash` (TEXT)
- `diff_summary` (TEXT)
- `status` (TEXT: `'success' | 'failure' | 'rejected'`)
- `ip_address` (INET)
- *Security*: `REVOKE UPDATE, DELETE` enforced.

### 3.7 Automatic Onboarding Trigger (`on_auth_user_created`)
- **Event**: `AFTER INSERT ON auth.users`
- **Function**: `public.handle_new_user()`
- **Behavior**: Automatically provisions a default personal organization (`"<User>'s Workspace"`) and an associated profile record with `role = 'owner'` whenever a user signs up via Supabase Auth (Email OTP or OAuth). This satisfies the `profiles.organization_id NOT NULL` constraint without requiring an external onboarding backend step.

---

## 4. Future Phase Entity Schemas (Scheduled)

- `repositories` / `repository_connections`: Tracks GitHub installations and branch configurations (Phase 3).
- `model_runs` / `tool_calls`: Tracks LLM inference tokens, tool arguments, and results (Phase 4).
- `workspaces` / `modifications` / `builds` / `tests` / `previews`: Tracks ephemeral sandbox execution (Phase 5).
- `server_connectors` / `connector_permissions`: In-host agent tokens and capability manifests (Phase 6-7).
- `security_events` / `detections` / `alerts` / `investigations`: Anomaly triage and forensic reports (Phase 8).
- `communication_metadata`: Thread references for WhatsApp and Gmail (Phase 9).
- `deployments`: CI/CD webhook tracking and post-deploy health status (Phase 10).
