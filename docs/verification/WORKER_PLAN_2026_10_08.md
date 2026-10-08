# Worker improvement proposal review - October 8, 2026

The proposed RAM savings, free-tier capacity and guaranteed stability had no
measurements. A single daemon would widen failure/privilege impact; a shared JS
pool cannot span web and worker processes. Automatically switching session-lock
workers to transaction pooling would violate their locking assumptions.

Implemented the safe alternative described in
[ADR 041](../decisions/041-worker-operations-and-verification.md):

- Removed duplicate web SMTP package declarations while retaining services-owned
  SMTP used by web OTP/team invitation flows. Moved Three.js types to development.
- Added bounded per-worker pool caps and rejection of the standard transaction
  endpoint for session-lock workers. No endpoint rewrite or SQL retry.
- Added sequential `verify:all`, explicit optional read-only checks and aggregate
  failure reporting. No destructive or provider-mutating probe is included.
- Added optional systemd grouping of existing separate services, corrected scripts
  documentation and a resource/deployment runbook. No real service was started.

Validation: `npm run verify:all` exited 0; secret scan, typecheck, lint, offline
tests and all 186 browser fixtures passed. Offline tests reported 97 application
suites and 30 Node tests and restored twelve runtime files. Isolated production
workspace build passed, and bundled server output still contains the SMTP
implementation. Production npm audit reports zero vulnerabilities; the five
development dependency findings remain open. Git whitespace and local Markdown
link checks passed.

Actual Linux systemd installation, provider configuration, peak-memory and
database-contention measurements remain pending. No unified daemon, automatic
model training, free-tier capacity or production uptime guarantee is claimed.
