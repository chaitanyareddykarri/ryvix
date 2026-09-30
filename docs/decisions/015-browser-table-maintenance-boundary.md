# ADR-015: Revoke browser table maintenance privileges

The 2026-09-30 verified-TLS, read-only catalog inspection found TRUNCATE,
TRIGGER and REFERENCES granted to anon/authenticated on public.connectors,
despite INSERT/UPDATE/DELETE already being revoked there. Row-level security
does not protect TRUNCATE. This is a database privilege finding, not evidence
that an unauthenticated HTTP endpoint currently exposes arbitrary SQL.

Migration 20260930000004 removes these three maintenance privileges from PUBLIC,
anon and authenticated across existing public tables, and from postgres-owned
default table grants for future migrations. It preserves ordinary row-operation
grants and RLS policies; the trusted backend and service role are unchanged.
Tables created by another owner require equivalent default-privilege setup.

This migration is prepared, not applied or certified against live user JWTs.
After rollout, verify has_table_privilege for anon/authenticated for each of
TRUNCATE, TRIGGER and REFERENCES across public tables. Do not execute TRUNCATE
as a test. Review any additional inherited-role privileges separately.
