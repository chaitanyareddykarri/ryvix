# Ryvix Complete Database Architecture & Security Specification

## 1. Single Centralized Database Architecture

Ryvix uses **one centralized Supabase PostgreSQL database** as the authoritative application datastore. The database does **not** live inside the web application, nor are separate databases maintained for the AI or backend.

```
                         SUPABASE CLOUD
                               │
                       PostgreSQL 15+
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
      WEB                   BACKEND                 WORKERS
  (Next.js 15)           (API Control)         (Queue Consumers)
       │                       │                       │
   RLS + Auth         Server authorization        Least Privilege
  (Public Anon)       (Service Role Key)       (Service Role Key)
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
                        Database Layer
                     (@ryvix/database)
                               ▲
                               │
                      Controlled AI Tools
                               ▲
                               │
                            AI Model
                      (ZERO Database Keys)
```

---

## 2. Complete 30-Table Entity Manifest

The complete database schema is version-controlled across two sequential, deterministic migrations in `supabase/migrations/`:
1. `20260921000001_phase1_core_schema.sql` (Baseline foundation & Email OTP onboarding)
2. `20260921000002_complete_platform_schema.sql` (Production distributed operations & self-healing platform)

| Domain | Table Name | Purpose | Primary Key | Foreign Keys / Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Identity & Access** | `organizations` | Multi-tenant customer accounts | `id` (UUID) | Tenant boundary |
| | `profiles` | User profiles mapped 1:1 to auth | `id` (UUID) | `id -> auth.users(id)` |
| | `organization_members`| Multi-user team RBAC memberships | `id` (UUID) | `organization_id`, `user_id` |
| | `api_keys` | Scoped CLI and automation tokens | `id` (UUID) | `organization_id` |
| **Projects & Envs** | `projects` | Repositories & environments container | `id` (UUID) | `organization_id` |
| | `environments` | Dev, staging, and production tiers | `id` (UUID) | `project_id` |
| **GitHub Integration** | `repository_installations` | GitHub App tenant installations | `id` (UUID) | `organization_id` |
| | `repositories` | Connected customer codebases | `id` (UUID) | `project_id`, `installation_id` |
| | `pull_requests` | PRs opened by Ryvix coding agent | `id` (UUID) | `repository_id`, `task_id` |
| **Connectors** | `connectors` | In-band daemons & cloud API bridges | `id` (UUID) | `environment_id` |
| | `connector_credentials`| KMS encrypted vault secret references | `id` (UUID) | `connector_id` |
| | `connector_capabilities`| Whitelisted actions per connector | `id` (UUID) | `connector_id` |
| | `connector_commands` | Async command queue for agents | `id` (UUID) | `connector_id` |
| **Server Inventory** | `servers` | Customer hosts, VMs, and baremetal | `id` (UUID) | `environment_id`, `connector_id` |
| | `services_inventory` | Discovered systemd units and processes| `id` (UUID) | `server_id` |
| **Observability** | `telemetry_metric_rollups`| 1-minute aggregated metric buckets | `id` (UUID) | `server_id` |
| | `health_checks` | HTTP / TCP uptime probe targets | `id` (UUID) | `environment_id` |
| **AI Model Tracking** | `model_providers` | Pluggable LLM provider endpoints | `id` (UUID) | Vendor registry |
| | `ai_model_runs` | Token accounting, latency, and costs | `id` (UUID) | `task_id`, `model_provider_id` |
| **Tasks & Planning** | `tasks` | Units of autonomous work requests | `id` (UUID) | `project_id`, `created_by` |
| | `plans` | Versioned multi-step execution plans | `id` (UUID) | `task_id` |
| | `plan_steps` | Normalized action steps | `id` (UUID) | `plan_id` |
| | `tool_calls` | Forensic execution traces of tools | `id` (UUID) | `task_id`, `step_id` |
| **Coding Sandboxes** | `workspace_profiles` | Stack runtimes (Node, Python, .NET) | `id` (UUID) | Stack registry |
| | `workspace_sessions` | Ephemeral Docker container sandboxes | `id` (UUID) | `task_id`, `project_id`, `profile_id` |
| | `build_runs` | Compilation stdout/stderr results | `id` (UUID) | `workspace_session_id` |
| | `test_runs` | Test suite execution statistics | `id` (UUID) | `workspace_session_id` |
| **Self-Healing & SOC**| `detection_rules` | Deterministic fast-path rule triggers | `id` (UUID) | Rule engine |
| | `security_events` | Detected attacks (SSH brute force) | `id` (UUID) | `server_id`, `rule_id` |
| | `incidents` | Outages, crashes, and anomalies | `id` (UUID) | `environment_id`, `server_id` |
| | `recovery_plans` | Multi-tier AI remediation plans | `id` (UUID) | `incident_id` |
| | `recovery_runs` | Anti-looping recovery attempts (1..3)| `id` (UUID) | `recovery_plan_id`, `server_id` |
| **Human Approvals** | `approval_requests` | Interactive approval gateway | `id` (UUID) | `organization_id` |
| **Audit Ledger** | `audit_events` | Immutable cryptographic log | `id` (UUID) | `project_id`, `actor_id` |
| **Notifications** | `notifications` | Delivery tracking (Web/WA/Gmail) | `id` (UUID) | `organization_id`, `recipient_id` |

---

## 3. Strict Security Invariants

1. **Row Level Security (RLS) on 100% of Tables**:
   - Every single tenant-owned table has RLS explicitly enabled.
   - Policies trace back through `organization_id` or `project_id` to verify active membership via `auth.uid()`.
2. **Audit Ledger Immutability**:
   - `REVOKE UPDATE, DELETE ON public.audit_events FROM authenticated, anon, public;`
   - Audit logs are mathematically append-only.
3. **Circuit Breakers on Self-Healing**:
   - `recovery_runs.attempt_number` has an explicit database constraint: `CHECK (attempt_number >= 1 AND attempt_number <= 3)`.
   - Prevents cascading infinite restart loops.
4. **Secret Storage Isolation**:
   - Passwords, SSH private keys, and OAuth tokens are **never** stored in plaintext columns.
   - Stored as encrypted references (`vault_secret_ref`) managed by the backend vault.
5. **Zero Direct AI Database Access**:
   - AI components receive **zero** database connection strings.
   - Database operations initiated by the AI must route through validated backend tools (`TaskRepository`, `AuditRepository`, etc.).
