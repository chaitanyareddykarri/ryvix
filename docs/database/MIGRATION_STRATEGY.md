# Ryvix Database Migration Strategy

## 1. Migration Philosophy & Invariants

Ryvix manages all PostgreSQL schema evolutions using versioned, sequential SQL migration files strictly under:
```
supabase/migrations/
```

### Core Invariants:
1. **Schema Source of Truth**: The database schema in `supabase/migrations/` is the single source of truth. Manual dashboard creations in Supabase are not permanent until captured in a version-controlled migration.
2. **Immutability of Applied Migrations**: Once committed and applied, a migration file is frozen. Any subsequent schema change requires an incremental, sequentially numbered migration file.
3. **Idempotence & Safety**: DDL commands use idempotent checks (`CREATE TABLE IF NOT EXISTS`, `ADD CONSTRAINT IF NOT EXISTS`) and specify rollback/cascading constraints explicitly.
4. **Zero-Downtime Expand/Contract**: Non-destructive column additions first, followed by application deployment, followed by deprecated column deprecation.

---

## 2. Active & Scheduled Migrations

| Migration File | Phase | Status | Tables / Features Included |
| :--- | :--- | :--- | :--- |
| `20260921000001_phase1_core_schema.sql` | **Phase 1 (Active)** | **Committed** | `organizations`, `profiles`, `projects`, `tasks`, `plans`, `audit_events`, plus RLS policies. |
| `20260921000002_github_and_repos.sql` | Phase 3 | Scheduled | `repositories`, `repository_connections`, `connected_accounts`. |
| `20260921000003_ai_and_workspaces.sql` | Phase 4-5 | Scheduled | `model_runs`, `tool_calls`, `workspaces`, `previews`. |
| `20260921000004_connectors_telemetry.sql` | Phase 6-7 | Scheduled | `server_connectors`, `connector_permissions`, telemetry partitions. |
| `20260921000005_security_and_alerts.sql` | Phase 8 | Scheduled | `security_events`, `detections`, `alerts`, `investigations`. |

---

## 3. Execution & Verification Workflow

- **Local Development**: Run `supabase migration up` or `supabase db reset`.
- **Automated Validation**: CI pipelines spin up ephemeral PostgreSQL test containers to validate migration execution and verify RLS isolation policies before PR merge.
- **Production Application**: Executed automatically via Supabase CLI in the deployment pipeline prior to updating backend service containers.
