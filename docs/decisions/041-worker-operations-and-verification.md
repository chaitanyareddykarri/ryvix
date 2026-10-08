# ADR 041: Keep worker isolation and simplify operational controls

Status: accepted for local implementation, October 8, 2026.

The proposed single Node daemon and web/shared-pool diagram do not reflect process
boundaries. No representative memory measurements support the proposed savings.
The coding worker needs Docker and a lifetime advisory lock; lock loss stops its
process. Gmail also uses a session lock and nested database operations. Combining
these with messaging and experience loops would widen failure impact and require
new lifecycle, scheduling and resource-isolation work.

Keep separate worker entry points and existing systemd restart policies. Add an
optional target with explicitly selected services, bounded per-worker pool caps,
and rejection of the standard transaction-pooler port where session locks are
required. Never switch endpoints or retry ambiguous SQL automatically. A minimum
of two pool clients preserves progress while a session-lock client is held.

Provide sequential developer verification with optional read-only hosted checks.
Do not aggregate mutating live probes, migration application, account deletion,
notification sends or paid evaluation into a default convenience command.

Move type-only dependencies to development and leave SMTP owned by the services
workspace. Verify typecheck and standalone build tracing before claiming removal
of duplicate web declarations is safe. No guaranteed RAM, free-tier, latency or
availability claims are made. Future consolidation requires measured load and
independent failure/lifecycle tests; no new database migration is required.
