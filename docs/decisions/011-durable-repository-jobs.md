# ADR-011: Durable repository task jobs

The web API atomically creates a task, audit event and repository job, returning
202 immediately. A separate workspace worker claims jobs with SKIP LOCKED,
records a lease and heartbeats it. Queued work survives HTTP disconnects. A lost
lease fails the task instead of silently rerunning potentially expensive work.
Completion locks the task and verifies the lease, membership and task state before
writing artifacts. Cancellation and PR shipping use the same task lock.

Only persisted project GitHub Vault credentials are available to workers. Browser
session tokens are never stored in jobs. Jobs contain IDs only. RLS denies browser
access. Migration 20260930000002 is required before deploying the queued task API.

Initial deployment uses one dedicated Docker host shared by web and worker; preview
routing must reach that host. Multiple independent Docker hosts require explicit
worker routing and are not supported by this implementation. Worker restart does
not extend container lifetimes. Configure approved images and enforce egress at
the network boundary before running customer repositories.
