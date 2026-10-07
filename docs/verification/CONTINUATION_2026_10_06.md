# October 6 interrupted-work continuation

Reviewed the existing uncommitted coding/embedding usage accounting and offline
and browser test additions. Preserved the pre-existing runtime data and Next.js
development-origin configuration. No commit, push or persistent migration applied.

## Completed local work

- Coding and embedding attempts use the existing durable ledger, with tenant,
  caller and exact worker/index claim checks before dispatch. Unknown token
  counts remain null. Migration `20261005000004` enables the new source types.
- Added cancellation checks after the asynchronous ledger start, before provider
  dispatch. Regression tests cover cancellation during that write and ensure
  final-ledger failures never cause an extra provider call.
- Fixed browser harness CSS-module bundling and included emitted styles. Loading
  assertions use an explicitly controlled response instead of a timing delay.
- Added rollback-only SQL coverage to `verify:capabilities` with
  `--nonstream-schema-preview`: cross-tenant access, caller roles, exact and expired
  worker/index claims, stale indexes, revoked roles and immutable finalization.

## Verification

- `npm run test:offline` runs `npm test`: 86 application suites and 23 Node tests
  passed. All 12 original AI runtime files were restored byte-for-byte; a separate
  backup hash comparison also passed.
- `npm run test:browser`: 18 passed. These render actual components with explicit
  framework/auth/API fixtures; they do not certify deployed authentication or E2E.
  The initial run found CSS-module harness errors and a Chrome startup failure;
  the final complete run passed without retries.
- Typecheck, lint and production workspace build passed. Next reports its existing
  `next lint` deprecation. Secret scan: zero findings. Diff whitespace check passed.
- Read-only live database verification: 136 passed, one failed (migration-ledger
  parity). The new migration remains a deployment prerequisite.
- `npm run verify:capabilities -- --nonstream-schema-preview` passed against
  Supabase with verified TLS. The schema preview and all fixtures were rolled back;
  no provider was contacted. This validates SQL behavior, not browser Auth flows.

## Remaining work

Apply the reviewed migration through the established deployment process before
enabling coding/embedding accounting, then rerun database boundary checks.
No real model requests, messages, releases or recovery operations were submitted.
Production browser/worker/provider acceptance, legacy completion accounting,
invoice reconciliation, representative reviewed AI evaluations and external
fine-tuning job integration remain open. The dependency advisory was not reassessed
in this batch. Existing AI runtime changes are not source changes to commit.
