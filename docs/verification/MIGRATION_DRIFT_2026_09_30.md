# Read-only migration inspection: 2026-09-30

Inspected the configured Supabase database using verified TLS and BEGIN READ ONLY.
Only catalog metadata was read; no migration history or application data changed.

## Task-artifact migration

The live ledger omits 20260928000001, but its inspected objects exist:

- task_artifacts has the seven expected columns, required nullability and defaults.
- Its primary key, task/repository foreign keys, SHA and JSON-array checks match.
- RLS is enabled; authenticated has SELECT only; anon has no table grant.
- task_artifacts_member_read matches the task/project/membership join.
- pull_requests.commit_sha and its check exist.
- pull_requests_one_per_task is a unique partial index on non-null task_id.
- health_checks_member_read and security_events_member_read match the expected
  membership joins; RLS is enabled on both tables.

These findings support repairing this migration's ledger entry rather than
replaying CREATE TABLE. They do not constitute a completed ledger repair or
live tenant-isolation test. Recheck the catalogs immediately before repair.

## Credential boundary

connector_credentials has no direct anon/authenticated table grants. connectors
has no INSERT/UPDATE/DELETE grants for those roles, but retains SELECT, REFERENCES,
TRIGGER and TRUNCATE. Vault schema/function grants were not inspected in this pass,
so the Vault migration cannot yet be certified as fully applied.

ADR-015 and migration 20260930000004 address the maintenance privileges. RLS alone
does not guard TRUNCATE. No table-maintenance command was executed during inspection.

## Remaining rollout work

The readiness check found signed telemetry receipts, auth_challenge_limits and
repository_jobs absent. Six pre-existing migration filenames are absent from the
ledger; the new maintenance-boundary migration makes seven pending ledger entries.
Reconcile the existing artifact/Vault objects and use the canonical migration
history before applying the remaining numbered migrations. Live role/tenant
verification is still required. Public preview/agent/worker settings remain missing.
