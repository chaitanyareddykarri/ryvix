# Capability implementation checkpoint — October 4, 2026

This batch follows published checkpoint `6334c4d`. Five incremental migrations
through `20261004000002` were rehearsed in a verified-TLS transaction and rolled
back, then applied with migration-ledger records. No reset, fake training dataset,
real notification, provider training job or customer operation was performed.

Implemented:

- Authenticated Google Pub/Sub intake, durable event deduplication, worker wakeup,
  periodic polling recovery and enabled-watch renewal.
- Separately granted Gmail send capability, owner-reviewed immutable expiring
  replies, single-attempt sending and conservative unknown outcomes.
- Provider-reported stream tokens, persisted web/WhatsApp usage and optional
  versioned cost estimates; removed invented completion token counts.
- Opt-in bounded Gemini embeddings, authorized semantic retrieval with post-call
  permission/commit checks, lexical fallback and static dependency neighbors.
- Expanded bounded coding dependency context across common language forms.
- Durable, audited, explicitly configured Slack/PagerDuty/Twilio P1 notification
  dispatch with Vault secrets, deduplication and rate limits.
- Separate external-training example submission, independent review, revocation,
  partition isolation and gated provider-neutral dataset export API and review page.

See [provider configuration and exact boundaries](../infrastructure/CAPABILITY_PROVIDERS.md).

Verification:

- `npm test`: 85 project suites passed, zero failed, plus 15 Node checks.
- `npm run typecheck`, `npm run lint`, and full `npm run build`: passed.
- `npm run verify:database`: 133 read-only checks passed, zero failures.
- `npm run verify:capabilities`: passed against the applied schema. Exercised
  Gmail review/replay/revocation, push deduplication without cursor advancement,
  notification deduplication/acceptance/cancellation, independent training review,
  cross-tenant denial, insufficient-data rejection and separate export partitions.
  All fixture records, including explicit test dataset rows, were rolled back.
- Secret scan: zero findings. Production dependency audit: zero vulnerabilities.
  Full development audit still reports five high findings through the existing
  Next ESLint / fast-glob / micromatch / braces chain; this remains in the pending list.
- Documentation link check: 18 changed/new documents, 99 local links, zero broken.
- Tests preserved and restored all 12 existing runtime data files with matching
  hashes. Preexisting dirty `ai/data` and `web/next.config.mjs` remain outside this batch.

Rollback SQL tests use real PostgreSQL authorization/locking paths with intercepted
providers. They do not certify live provider delivery, browser workflows, representative
model accuracy, universal dependency resolution or production worker deployment.
