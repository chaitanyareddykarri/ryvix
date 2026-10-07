# 040: Server-only project environments

The fleet enrollment modal may create a project environment without GitHub.
Reuse existing projects/environments and existing RLS; no schema migration.
Creation is an explicit authenticated operator action, tenant-scoped and rechecked
under organization/membership locks. Normalize names into deterministic namespaced
slugs so retries reuse the same setup. Never silently change an existing environment's
production classification. Audit creation atomically and limit creations per user.

The result is setup metadata only. Server installation, enrollment tokens, signed
telemetry and independent operational approval remain separate existing workflows.
