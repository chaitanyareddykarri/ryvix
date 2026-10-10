# Task check history and URL-based mock metrics

Implementation verified locally; publication and deployment authorized October 11.
Promote through Testing_branch and passing CI. Production status must be verified
against the resulting main commit; prior production release was 1f0d915.

Repository execution emits bounded stage/status records into the existing
append-only audit_events ledger under task.pipeline.progress, keyed by the task
hash. Each write rechecks the job lease and creator membership in a transaction.
Only fixed stage metadata, duration and exit status are stored; no raw model
output, command stdout/stderr or credentials are included. No new schema is needed.
Task reads filter by authorized projects and task hashes under existing RLS.
History is bounded to 500 events per task-list response, with an explicit limit
warning. Older workers/tasks show missing history, never synthesized success.

Stages include stack analysis, source inspection, planning, editing, installation,
tests, typecheck, configured lint, build, at most one repair, measured diff and
preview startup. Configured verification checks rerun after the one repair.
Missing scripts and restricted-static limitations are marked skipped. Failures
survive unsuccessful tasks; events that cannot be completed after lease loss
are labelled interrupted when a task fails/cancels. This is execution evidence,
not an independent code/security review or a proof of source-loop termination.
Tasks and dashboard previews display the history; shipping still needs approval.

The server demo now accepts a website URL and generates random CPU/RAM/disk,
response-time and request-count examples. Only the parsed origin is displayed,
not URL queries or credentials. URL edits clear previous examples. No request is
made to the supplied URL, no provider/server relationship is inferred, and no
demo data is written to production tables. Every example is labelled simulated.
Actual website checks remain a distinct flow at /websites.

Validation: typecheck, lint, secret scan and offline tests passed (97 application
suites; 12 AI files restored). Five targeted browser tests passed, including
failure/repair history and URL demo isolation. Real local Docker static acceptance
passed with stage assertions. One initial Docker run failed without a diagnostic;
two subsequent runs passed. Provider endpoints in task acceptance are fixtures;
hosted worker rollout and real-provider task acceptance remain unverified.

Deployment note: the local source worker must be restarted on the new version.
Any image-based worker must use a newly built reviewed image. The Railway wrapper
still pins an earlier generic-worker image; pushing web code alone does not update
that image or activate a workspace worker.
