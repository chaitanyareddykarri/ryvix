# B1-B12 verification and corrections

## Historical checkpoint — 2026-10-02

This report is retained as evidence of its original inspection or test run.
The latest implementation checkpoint is `45b130b`: cloud recovery, WhatsApp P1
dispatch, security email and approved releases are implemented in that checkpoint.
The latest recorded schema is `20261002000003`; provider acceptance is still pending.

See the [current project status](../PROJECT_STATUS.md) for the
implemented scope, migration checkpoint, verification evidence and remaining work.
Results and pending lists below describe the original checkpoint; later changes
are recorded in the status index. Historical counts are intentionally preserved.


Reviewed against the current source on 2026-10-01.

| Claim | Result |
| --- | --- |
| B1 | Confirmed wrong process boundary, but cleanupPersistedSession can inspect persisted containers without an in-memory session. Web lifecycle now expires sessions transactionally; the worker performs cleanup. Deletion returns 409 until destruction is recorded and checks again before deleting. Cancellation does not wait for Docker. |
| B2 | Already addressed: direct web workspace execution remains unavailable; unexpected errors are generic. This does not mean direct execution was implemented. |
| B3 | Fixed: settings GET requires authenticated, current tenant membership before direct database access. Queries use the verified organization rather than a second profile lookup's organization. |
| B4 | Fixed: settings GET/POST return generic unexpected-failure messages. |
| B5 | Fixed remaining POST raw-error response; analysis failure logging no longer prints raw exception objects. |
| B6 | Fixed: cluster incident IDs use crypto.randomUUID. |
| B7 | The supplied fixed label was incorrect: the placeholder remained. Replaced with SHA-256 of evaluation inputs. Evaluator still only constructs drafts; no database audit persistence is implied. |
| B8 | Already addressed: database failure retains its cause and logs a sanitized code. |
| B9 | Incorrect as cited: line 284 belongs to handleResendSignupOtp, used by the signup verification form. Its signup resend endpoint is correct; no change made. |
| B10 | Already addressed: index.ts reexports orchestrator without repeating these exports. Compatibility exports in orchestrator remain required by direct imports and package entrypoint. |
| B11 | Incorrect: task.repository.ts and audit.repository.ts import db from backend/src/db.ts. Retained. |
| B12 | Already addressed: renamed tenant-predicate.test.ts and explicitly labelled as JavaScript unit coverage. Live provider-JWT RLS verification remains a separate pending task. |

Cancellation cleanup is asynchronous and requires the owning worker/Docker host
to be available. The current architecture still needs multi-host ownership routing
before distributing workspace jobs across unrelated Docker hosts.

Tests cover authorization rejection before settings queries, verified-tenant
selection, sanitized errors, durable cancellation/expiry, deletion retry and
destruction guards, UUID incident IDs and non-placeholder evaluation hashes.
Existing user AI runtime-data changes are preserved and excluded from the commit.

Validation: 66 project suites and 15 Node tests passed. Typecheck, lint, production
build, secret scan (zero findings) and whitespace checks passed. These are local
checks, not a live multi-host cancellation or provider-JWT browser certification.
