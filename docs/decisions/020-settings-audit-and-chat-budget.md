# ADR-020: Transactional settings and durable chat request budgets

Organization settings and API key creation lock current membership within the
same transaction as mutation and append-only organization audit insertion.
Project audit_events remain unchanged because an organization can have no project.
Organization audit entries exclude raw keys and are readable only by current
owners/admins. Browsers cannot mutate the audit or budget tables.

Chat leases enforce concurrency but not sequential abuse. Add fixed UTC hourly
request counters per organization and user. Admission locks membership, increments
both counters atomically, and rolls back on denial. Allow 60 admitted requests per
user/hour and 600 per organization/hour. Failed provider calls consume admission;
invalid conversation ownership rolls it back. No fabricated token accounting.
Old buckets are removed during admission for that organization after two days.

Project GitHub operations require persisted, scoped Vault credentials. Browser
OAuth cookies are limited to account connection/discovery flows.
