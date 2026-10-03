# Experience and personal memory checkpoint — 2026-10-03

Implemented explicit user/organization memory, owned chat corrections, opt-in
project outcome collection, independent lesson review/revocation, bounded lesson
retrieval in chat and coding, actual saved-response measurements, operational
outcome windows and observation-only classifier predictions. Added `/experience`,
an authenticated API and a separate collection worker/service.

Removed legacy global pattern lookup/automatic learning from the anomaly diagnosis
path. Empty-data readiness metrics are unavailable, measured latencies replace a
constant, and the offline export sanitizer handles nested fields. Answer evaluation
now records prompt/dataset hashes and detects comparable-baseline regressions.

## Experience foundation verification

- `npm test`: 76 project suites passed, zero failed, plus 15 Node checks.
- Workspace typecheck, lint and production build passed during implementation.
- `verify:experience`: real PostgreSQL rollback fixtures passed tenant denial,
  personal-memory isolation, all six automated source collectors, deduplication,
  raw-secret exclusion, independent review, revoked reviewer access, source expiry,
  owned chat corrections, opt-out purge, measured response storage and read-only
  prediction recording. The classifier fixture is artificial and proves no accuracy.
- Supabase CLI dry-run selected only `20261003000001_experience_memory.sql`.
  That migration was applied using verified TLS without resets, seeds or repairs.
- `verify:database`: 109 read-only checks passed, zero failures after rollout;
  new tables deny browser access.
- A one-shot experience worker run connected successfully and collected zero
  records with no projects opted in. This is startup evidence, not a deployed service.
- All 12 original runtime files were restored and hash-verified after tests.
  Runtime data and the separate local `web/next.config.mjs` edit are excluded
  from this source publication. Secret scan found zero findings; 57 local
  documentation links resolved.

These results validate local behavior and database boundaries, not live model
quality, browser acceptance or deployed collection. Go code was not changed.

## Measured production prerequisites

A read-only query found zero approved learning examples, zero evaluated checkpoints
and zero active classifiers. No real training run was possible with that dataset.
Normal local environment sources expose no supported LLM provider key or public
application URL. Previously supplied keys may exist elsewhere; this inspection
does not establish their absence from remote secret stores.

No provider fine-tuning, real attack, server command, external notification or
customer deployment was performed by this batch. Authenticated deployed browser
testing and live answer-quality evaluation remain unavailable here.

See [setup and limitations](../infrastructure/EXPERIENCE_AND_MEMORY.md). This is a
controlled experience foundation, not completed universal self-learning.
Reviewed general-purpose/coding datasets, provider-specific
fine-tuning and automatic staged model rollout are still outstanding.

## Repository knowledge continuation

Added `/knowledge`, a separately opted-in repository index, durable worker claims,
bounded sanitized commit snapshots and tenant-authorized PostgreSQL full-text
search. Selected-repository chat verifies the current GitHub commit before using
an index; general chat labels dated snapshots. Admin revocation, disable and
24-hour staleness prevent retrieval. Disable also prevents in-flight publication.
This is not a complete semantic vector index or external model training.

- `npm test`: 77 project suites passed, zero failed, plus 15 Node checks.
- Workspace typecheck, lint and production build passed; secret scan: zero findings.
- Real SQL rollback checks passed indexing, secret exclusion, cross-tenant denial,
  commit mismatch, stale snapshot, revoked configuring admin and cancelled publication.
  The GitHub reader was injected; no real repository was indexed in this check.
- Verified-TLS migration dry-run selected only `20261003000002_repository_knowledge.sql`;
  it was applied without resets, seeds or repairs.
- After application, 113 read-only database boundary checks passed, zero failures.

The older synthetic integration suite prints broad success messages and tolerates
an unauthenticated local HTTP check returning 401. Its pass count is not evidence
of authenticated deployed browser behavior or a real task-to-PR workflow.
See [index deployment and limits](../infrastructure/REPOSITORY_KNOWLEDGE.md).
