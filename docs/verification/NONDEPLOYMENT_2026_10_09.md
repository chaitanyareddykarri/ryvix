# Non-deployment backlog implementation - October 9, 2026

This is a bounded implementation batch, not completion of every product ambition.
No Oracle installation, paid model job, customer message, commit or push performed.

## Changes

- Optional native journal-unit collector, signed bounded log endpoint, redaction,
  stable deduplication, tenant-scoped HOST records and seven-day cleanup. See
  [log scope and limitations](../infrastructure/HOST_LOGS.md). Initial SSH burst
  and OOM rules create observations, not comprehensive security scanning.
- Persist authenticated service/container inventory previously discarded by the
  telemetry endpoint. Reject invalid/bounded inventory and preserve newer samples.
- Extractive history compaction with a configurable character budget (default
  200,000); system messages and current request remain intact. Oversized current
  source/request fails explicitly. No semantic summarizer or token-exact guarantee.
- Typed provider-quota exhaustion and durable pre-plan coding-job deferral. Maximum
  three retries, no waits above one day; cleanup must succeed, authorization and
  lease checks remain mandatory. No retry of partial streams or shipped actions.
- Removed model gateway's hidden local-file credential discovery. Web/framework
  and worker entry points supply explicit environment credentials. This fixed
  twenty blocked network attempts detected by the offline runner after local keys
  were configured. The final offline run makes no unexpected network attempts.
- TypeScript compiler module resolution over supplied snapshots only; never reads
  host dependencies or executes customer config. Broader language semantics and
  representative retrieval evaluation remain pending.
- `node --import tsx scripts/reconcile-usage.ts input.json` compares saved usage
  exports with identical account/window scope, aggregates provider/model totals,
  and distinguishes mismatched/missing/unknown usage. This does not certify invoices
  or retrieve provider account reports automatically.
- Replaced the pinned Next lint plugin's sole fast-glob directory-discovery call
  through a narrow local tinyglobby adapter. Removed the vulnerable transitive
  chain without a Next downgrade. See [ADR 045](../decisions/045-next-lint-glob-adapter.md).
- Added rollback-only hosted SQL verifier for new migrations, log signatures and
  deduplication, environment idempotency/tenant denial, invitation replay and
  persisted quota waits. It never calls the global job-claim operation.

## Verification

- Offline suite: 97 application suites and 41 Node tests passed; twelve AI runtime
  files restored byte-for-byte, including the final dependency follow-up run.
- Typecheck and lint passed; isolated production workspace build passed.
- Browser fixtures: 187 passed. These are local browser fixtures, not live flows.
- Native Windows Go tests across all packages and `go vet ./...` passed.
- Secret regression scan: zero findings. Git whitespace check passed.
- `scripts/verify-nondeployment-sql.ts --rollback-test` passed against hosted
  PostgreSQL, then rolled back all schema and synthetic fixture changes. This
  verifies transactional behavior, not concurrent multi-session behavior.
- Read-only database boundary verification: one failure, the new migration ledger
  entries are absent; other reported checks pass. Migrations `20261009000001` and
  `20261009000002` are prepared and rollback-tested, NOT applied persistently.
- Read-only dataset count: zero approved rows in both `learning_examples` and
  `external_training_examples`. No training run or accuracy score was fabricated.
- Baseline npm audit had five high findings. The upstream braces advisory remains
  unpatched; the scoped replacement removes that dependency chain. Final npm
  audit reports zero vulnerabilities across development and production. A clean
  `npm ci --ignore-scripts` in an isolated manifest copy passed, as did loading
  and exercising the installed adapter. The final production build passed.

## Remaining work, separate from hosting

1. Continue tracking the scoped lint adapter when upgrading Next. The recorded
   dependency chain has been replaced; it is no longer an unimplemented fix.
2. Broader parsers/compiler graphs, dynamic reference analysis and representative
   repository retrieval evaluation. Current changes improve bounded JS/TS only.
3. Representative consented, independently reviewed learning examples, held-out
   measurements and drift monitoring. Database has no approved examples today.
4. External training provider/model choice, paid-job lifecycle adapter, approved
   budget/data and measured promotion/rollback. Dataset export already exists;
   an unanswered provider-selection question is not approval for a paid job.
5. Actual account usage/invoice exports and provider-specific reconciliation.
6. Concurrent invitation, URL-update and environment-creation acceptance in an
   authorized isolated test database. Rollback fixtures do not prove concurrency.
7. Additional collector sources, durable log cursors/backfill, cross-batch detection
   and broader security-scanner coverage if these are required product scope.

## Saved usage input

Input has `local` and `provider` arrays of `{provider,model,promptTokens,
completionTokens,requests}` and `scope` with `localAccount`, `providerAccount`,
`localStart`, `providerStart`, `localEnd`, `providerEnd`. Use matching account IDs
and exactly matching ISO interval endpoints. Counts may be null; unknown is never
treated as zero or certified matched. Files are operator-controlled exports; this
CLI neither queries customer accounts nor changes database records.
