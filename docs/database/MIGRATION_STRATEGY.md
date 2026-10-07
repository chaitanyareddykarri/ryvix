# Database migration strategy

## Current hosted checkpoint

All numbered migrations through `20261007000001_repository_live_url.sql` are
applied. The October 7 Supabase CLI dry run reports no pending migrations.
[Rollout evidence](../verification/MIGRATIONS_2026_10_07.md).

Recent additions are nonstream model-attempt accounting (20261005000004),
backend-only team invitations (20261006000001), and nullable repository website
URLs with a validated format constraint (20261007000001). Google login and
server-only project/environment creation require no additional migration.

## Workflow

1. Inspect the current hosted ledger and schema using verified TLS. Use the
   existing hosted Supabase project; never reset it or start a local database
   container for this project.
2. Describe schema changes in an ADR and a new numbered SQL file under
   `supabase/migrations`. Do not edit applied migrations or replay consolidated SQL.
3. Use the established Supabase CLI migration workflow with a dry run first.
   Inspect exactly which migrations will run; resolve unexpected drift before
   mutation. Keep credentials in ignored configuration or the secret store.
4. Apply reviewed incremental migrations, then repeat the dry run and run
   `npm run verify:database`. Verify ledger parity, RLS, browser grants and new
   constraints. Application deployment and authenticated flow acceptance are
   separate checks.

The compatibility script `scripts/apply-pending-migrations.ts` is intentionally
disabled. Do not bypass migration history with ad-hoc table creation or use a
history repair to conceal unapplied SQL. CI/deployment automation is not assumed
from the existence of migration files; the October 7 rollout was CLI-driven.
