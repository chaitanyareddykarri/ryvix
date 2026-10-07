# ADR 038: Team invitations and explicit API access

Use hashed, expiring, single-use invitations bound to a verified account email.
Acceptance is explicit and does not upgrade an existing membership. Serialize team
mutations on the organization row, recheck actor roles inside the transaction,
protect owners and audit each mutation atomically. Disallow self-removal and guard
the last owner. Membership revocation does not delete historical records; workers
must continue their existing authorization rechecks. Prevent removal/demotion of
active channel owners until those connections are transferred or disconnected.

The new invitation table is backend-only with RLS, no anonymous/authenticated
grants, and an incremental migration. The migration is not applied in provider-free
verification. Invitations can be shared manually; email is an explicit optional
delivery action and unknown delivery never becomes a receipt claim.

Expose API credentials only on versioned read endpoints, initially organization
server inventory. Validate stored SHA-256 hash, expiry, revocation and `read` scope
on every request. No API credential can approve releases, mutate teams, or execute
operations. Future write scopes require separate reviewed authorization contracts.
