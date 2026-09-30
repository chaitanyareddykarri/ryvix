# Supabase migration rollout — 2026-09-30

User explicitly authorized live migration. Used Supabase CLI 2.118.0 against the
configured cloud database with verify-full TLS and the official CA. Credentials
were supplied through the child process environment, not command arguments,
tracked files or logs. No local PostgreSQL instance was created.

## Applied changes

1. Rechecked artifact columns, constraints, indexes, policies, RLS and grants
   against the prior catalog snapshot. Saved a local ignored ledger/catalog copy.
2. Repaired `20260928000001` to applied, because its inspected objects already
   matched. The existing table and data were preserved.
3. Applied `20260929000001`, `20260929000002`, and `20260930000001` through
   `20260930000004` using `supabase db push --skip-vault`.

The first Vault migration attempt failed with 42501 and rolled back: postgres
cannot revoke privileges on Supabase-owned internal crypto functions. Before its
successful application, the pending migration was corrected to revoke create/update
entry points and explicitly assert no browser role can execute any Vault function.
No exception is swallowed, and internal function ownership is unchanged (ADR-008).

## Verification

`npm run verify:database`: 31 checks passed, zero failed, using read-only SQL:

- All numbered migrations recorded; required rollout tables present.
- RLS enabled on every public table.
- No anon/authenticated table-maintenance privileges across public tables.
- No browser schema, function or secret-read access to Vault.
- Enrollment, replay receipts, OTP, job and credential tables are backend-only.
- No direct browser mutation grants on protected workflow/telemetry/connector tables.
- Profile organization and role columns cannot be updated by browser roles.

`npm run verify:runtime`: database TLS, tables and ledger pass. The command still
exits nonzero because preview domain/signing, public application URL, agent release
manifest and production workspace/broker image settings are missing.

These catalog checks do not certify real user JWT tenant isolation, OAuth-to-worker
execution, device enrollment, provider delivery, or public previews. Those remain
separate integration checks. No customer server operation or repository mutation
was performed as part of this database rollout.
