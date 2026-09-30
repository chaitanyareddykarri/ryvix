# ADR-010: Durable authentication challenge limits

Status: accepted for implementation; migration requires live validation.

Encrypted login/signup cookies remain the transport for existing OTP flows.
PostgreSQL stores only keyed subject hashes and token hashes, never passwords or
OTP values. One active token exists per subject and purpose. An atomic update
consumes a correct OTP before session establishment and counts incorrect attempts.
Five attempts, five sends per ten-minute window and a one-minute send cooldown
are enforced across processes. Resend replaces the active token without resetting
attempts or expiry. Missing state, database failures and expired tokens fail closed.
Failed resend delivery still returns the renewed encrypted cookie matching the
reserved ledger hash, including when the mail transport throws. The response is
an explicit delivery failure; after the cooldown the user can resend using that
cookie. The old OTP never becomes valid again and expiry/attempt budgets remain
unchanged. Failed session establishment requires restarting the flow. Old cookies
require a fresh challenge after rollout.

The table has RLS enabled and no browser policies or grants. Apply migration
20260930000001 before deploying the updated authentication routes.
