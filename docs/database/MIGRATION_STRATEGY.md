# Ryvix Database Migration Strategy

## Implementation checkpoint — 2026-10-03

Code checkpoint: `d81b281`; applied migrations through `20261003000004`.
Implemented: reviewed experience/personal memory, bounded repository indexing,
Gmail SMTP email, WhatsApp OTP identity, opt-in AI replies/history/quotas, confirmed
coding requests, task notifications and authenticated approval handoffs. Releases
and server operations retain their existing web authorization and approval checks.
Recorded verification: 79 project suites plus 15 Node checks, typecheck/lint/build
and 125 database boundary checks passed. Provider delivery, deployed workers/browser
acceptance and representative model accuracy remain unverified.

See [project status](../PROJECT_STATUS.md), [assistant setup](../infrastructure/WHATSAPP_ASSISTANT.md) and
[recorded verification](../verification/WHATSAPP_ASSISTANT_2026_10_03.md). This documentation update did not rerun those
code checks. Detailed designs below may include planned capabilities; the status
index distinguishes implemented behavior from future work.


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

## October 3 schema additions

The applied checkpoint is 20261003000004. Incremental migrations add:

- 00001: experience_settings, experience_events, experience_lessons, personal_memories, experience_predictions.
- 00002: repository_knowledge_settings, repository_knowledge_files.
- 00003: whatsapp_phone_links, whatsapp_phone_challenges.
- 00004: whatsapp_assistant_sessions, whatsapp_assistant_messages, whatsapp_assistant_proposals, whatsapp_assistant_outbox.

These use RLS and backend-mediated authorization. Do not reset the hosted database.
Assistant history is separate from web conversations; phone unlink invalidates its
derived session data. See [assistant guide](../infrastructure/WHATSAPP_ASSISTANT.md).
