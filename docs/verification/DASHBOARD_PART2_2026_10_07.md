# Dashboard Part 2 audit and repairs — October 7, 2026

> Historical checkpoint: later implementation and applied-migration status are
> recorded in [current status](../PROJECT_STATUS.md), [pending work](../PENDING_WORK.md)
> and the [October 7 rollout](MIGRATIONS_2026_10_07.md). Original findings and test
> results below describe this report's checkpoint, not the current pending queue.

## Claims checked against current code

| Claim | Finding before this phase | Repair |
| --- | --- | --- |
| Neural diagnosis button rejected | Correct. It called an intentionally rejected synthetic diagnosis action. | Replaced with an explicit link action to authenticated evidence chat; removed unused synthetic diagnosis presentation. The legacy endpoint still safely rejects the unsupported action. |
| Four deployment stages never advance | Stale checklist/state remained, but the current PR handler did not enter that overlay. | Removed the overlay and unsupported deployment states. Approval now says Create Pull Request and explains separate merge, CI/CD and runtime checks. Removed invented file count, branch and zero-downtime promises. |
| Live URL is browser-only | Correct. Two UI paths wrote local storage. | Both use an authenticated persistent API, with explicit save, reload, error presentation and clear-by-saving-empty. Skipping the onboarding modal only dismisses it. |
| Dashboard never persists chat | Partly incorrect: its API already persisted turns and returned a conversation ID. Reload was missing. | Loads the most recent authorized conversation and its saved turns on mount, continues that conversation, and links to the dedicated chat history selector. Loading/failure prevents accidentally sending into an un-restored conversation. |

The earlier phone popup, dashboard deployment observations and operational navigation fixes remain present. This phase did not use real providers.

## Persistence boundaries

`/api/github/repositories/live-url` reads through current tenant membership and
writes only for operators, rechecking a locked membership in the transaction.
The repository must belong to that organization. Update and hashed audit event
commit together. Only HTTP(S) URLs without embedded credentials are accepted.
The URL is a display configuration, not verified health evidence; the endpoint
does not fetch it. Browser caching is no longer authoritative. A stale request
cannot overwrite another selected repository's displayed URL.

Added ADR 039 and migration `20261007000001_repository_live_url.sql`. This migration
is **unapplied**. The API reports unavailable if the schema is not deployed;
the interface does not pretend a failed save was persisted. Prior local-only URL
values must be explicitly re-entered and saved; they are not silently copied into
another tenant. Removed the dashboard's fallback to cached repositories when the
authenticated repository list is empty.

## Verification

- Offline test wrapper: **93 application suites passed, zero failed**, plus 24 Node tests; 12 AI runtime files restored byte-for-byte.
- Two new browser cases passed: saved chat restoration/evidence navigation and URL denial/save/reload.
- Dashboard regression selection: **14 passed**, covering phone onboarding, navigation, recorded deployments and widths 320, 375, 390, 768 and 1280px.
- Typecheck and production build passed; secret scanner found zero findings.
- Whitespace check passed with `git -c core.safecrlf=false diff --check` (avoids Windows line-ending conversion warnings).

Service tests use query fixtures, and browser tests use isolated authenticated
responses. They do not certify hosted SQL, actual provider responses or physical
phones. Logs are in ignored `tmp/render-audit/part2-*`.

## Remaining acceptance

Apply both pending migrations (`20261006000001` team invitations and
`20261007000001` repository URL), then run real database/RLS/concurrency and
authenticated cross-device persistence checks. Provider delivery and customer
CI/CD/runtime acceptance remain for the provider phase. General backlog items
outside these dashboard findings remain in `docs/PENDING_WORK.md`.
