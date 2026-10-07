# Hosted migration rollout - October 7, 2026

The user authorized applying pending migrations to the configured Supabase database.
The existing Supabase CLI workflow used verified TLS and numbered migration files.

- Preflight dry run identified exactly `20261006000001_team_invitations.sql`
  and `20261007000001_repository_live_url.sql`.
- Both migrations applied successfully. No seeds, resets or migration-history
  repair were performed.
- The subsequent CLI dry run returned `upToDate: true` and an empty migration list.
- `npm run verify:database` exited successfully with zero failures. It confirmed
  the migration ledger, public-table RLS, browser-role mutation restrictions and
  Vault restrictions. Added checks confirmed invitation browser access denial,
  service-role CRUD access, the nullable repository URL column and its validated
  format constraint.

Earlier notes describing these two migrations as unapplied are superseded.
Google authentication and server-only environment creation need no additional
migration. Deployment, authenticated cross-device user flows, server-only
concurrency acceptance, Google activation and real-provider acceptance remain
separate pending work. This rollout did not rerun application or browser suites.
