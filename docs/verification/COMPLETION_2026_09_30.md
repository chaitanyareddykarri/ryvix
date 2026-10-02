# Remediation checkpoint — 2026-09-30

## Historical checkpoint — 2026-10-02

This report is retained as evidence of its original inspection or test run.
The latest implementation checkpoint is `45b130b`: cloud recovery, WhatsApp P1
dispatch, security email and approved releases are implemented in that checkpoint.
The latest recorded schema is `20261002000003`; provider acceptance is still pending.

See the [current project status](../PROJECT_STATUS.md) for the
implemented scope, migration checkpoint, verification evidence and remaining work.
Results and pending lists below describe the original checkpoint; later changes
are recorded in the status index. Historical counts are intentionally preserved.


## Implemented in this continuation

- Follow-up audit fixes: `/api/workspace` no longer attempts execution through
  the web process's Docker singleton, and unexpected failures return generic
  client messages. OTP resend replacement now matches the prior token and an
  unexpired ledger row without comparing redundant expiry parameters; it keeps
  the original expiry. Server POST auth resolves tenant identity once. Database
  query errors retain an internal cause and log only the SQLSTATE. Worker claim,
  completion and failure audit rows are attributed to `system`.
- Removed the unused in-memory workspace cleanup worker and its object-mutation
  test. Tests now exercise `RepositoryJobStore.markDestroyed()` persistence and
  system audit attribution. The backend database-client module and orchestrator
  compatibility exports are retained because repository code and direct-module
  callers use them. Tenant predicate tests now say explicitly that they are not
  PostgreSQL RLS tests.
- External monitor's constructed record IDs use UUIDs. Its evaluator still only
  constructs in-memory incident/notification/audit objects; it does not persist
  incidents or send notifications.

- High-impact cloud reset now fails closed with HTTP 409 until the platform has
  a persisted approval request/decision/dispatch workflow. The servers page no
  longer presents a clickable reset action, and a regression test confirms
  `approved: true` cannot reach a cloud operation. Remote in-agent commands
  remain unavailable pending authenticated dispatch and persisted approval;
  corresponding restart controls are disabled in the servers page.

- Observability logs now read curated tenant-scoped audit/security records and
  latest recorded health-check snapshots. The previously missing API validates
  filters and limits, excludes raw evidence/credentials, and reports storage errors.
  The UI cancels stale requests and distinguishes errors from empty results.
- ADR-018/migration 20260930000006 protects operational evidence, project and
  environment writes from browser bypass. Restrictive membership policies close
  stale-profile access to project-derived data. Operation audit writes now lock/
  recheck membership and use the backend pool; the migration is applied.
- Public endpoint diagnostics (ADR-017): authenticated operators, explicit targets,
  public IPv4 validation, pinned DNS, standard ports, no redirects and bounded
  requests. Removed guessed server/environment, localhost and fabricated heartbeat
  fallbacks. The endpoint reports measured reachability without writing unverified
  health records; host health requires registered endpoint/heartbeat evidence.
- Deployment status ingestion (ADR-016): bounded HMAC-verified GitHub webhook,
  verified repository mapping, durable deduplicated events and atomic audits.
  Tenant diagnostics expose curated provider facts; runtime health is explicitly
  unverified. Migration 20260930000005 is applied. Existing repositories must be
  reconnected before receiving trusted events; no trust was backfilled.
- Durable OTP ledger: one-use consumption, five-attempt budget, resend replacement,
  cooldown and send limits. Plaintext passwords/OTPs never enter ledger rows.
  Resend delivery failures (including thrown transport errors) return the renewed
  encrypted cookie matching the reserved ledger token. Regression tests cover
  login/signup recovery without extending expiry or restoring an old OTP.
- Durable repository queue: atomic task/job/audit insertion; separate worker,
  bounded admission, leases/heartbeats, lost-worker failure, final authorization
  checks and atomic artifact completion. The web API returns 202; task/dashboard
  views poll persisted state. Workers require project-scoped Vault credentials.
- Cancellation/deletion uses task locks, tenant/role/creator checks, durable
  cancellation before cleanup, visible cleanup failures and retryable records.
- Docker identity labels support verified recovery after process restart;
  expired/failed/cancelled workspace cleanup is retried by the worker.
- Preview launch grants are signed by web while the worker owns the gateway.
  Next.js/Vite/npm/pnpm/yarn script selection respects the detected package manager.
- PR approval and request audit are committed before GitHub writes; task state
  and authorization are rechecked after reacquiring the task lock.
- Legacy simulated telemetry and successful server operations moved out of
  production into explicit test fixtures. Native collection fails visibly;
  server commands require an authenticated dispatcher and persisted approval.
- Unverified Gmail headers cannot create tasks using the first user profile.
  Digest text is escaped and unsafe links omitted. Gmail inbound remains disabled
  until a verified provider transport and sender mapping are implemented.
- GitHub OAuth requires operator access, validates return paths, rejects redirects
  during token exchange, checks persistence failures and avoids token-response logs.
- Prepared browser-write restrictions for profiles and workflow records, and
  removed recursive profile SELECT policy logic. Live RLS tests remain required.
- Added a read-only readiness probe, a Node workspace image recipe and a Linux
  systemd worker service example.
- Replaced the label-only egress network with an isolated HTTPS CONNECT broker:
  exact registry/GitHub hosts, public-address validation, DNS address pinning,
  bounded connections and short-lived containers. Added a trusted loopback preview
  relay because Docker does not publish ports from internal-only containers.
- Recovery cleanup verifies broker ownership labels and removes brokers even if
  a worker crashed before persisting the preview URL. Foreign brokers are rejected.
- Added repeatable opt-in `npm run verify:workspace` against real Docker.
- Checkpoint `8203118` pushed to `fix/production-remediation` after verification.
- Repository selection now verifies GitHub metadata/branch and atomically saves
  its project, environment, connector, Vault credential, repository and audit.
  The upsert uses the actual schema key. OAuth/PAT sessions no longer write user
  IDs as App installations. Tenant/operator checks protect connection mutations.
- The repository wizard checks save failures, passes the persisted UUID to its
  parent, and reports request-based progress. Optional server setup reuses the
  signed enrollment modal; the fabricated installer fallback is removed.
- Connect Server has responsive dark styling, keyboard focus handling, explicit
  clipboard controls/errors and cancellation of pending enrollment requests on
  close. Matching signed telemetry remains the condition for connection success.

## Rollout dependencies

Update: [live migration rollout](MIGRATION_ROLLOUT_2026_09_30.md) completed through
20260930000004 after user authorization. The list below describes the applied
prerequisites for other environments; no local migration entries remain absent
from this Supabase project's ledger. Production configuration is still required.

Reconcile migration history and apply canonical numbered migrations in order,
including the earlier task-artifact, Vault and signed-telemetry migrations plus:

1. `20260930000001_auth_challenge_limits.sql`
2. `20260930000002_repository_jobs.sql`
3. `20260930000003_protected_workflow_records.sql`
4. `20260930000004_browser_table_maintenance_boundary.sql`

Do not serve these changed routes before migrating. Run the workspace worker on
the Docker host: `npm run worker:workspaces`. The service example assumes a
trusted worker account, installed dependencies and `/etc/ryvix/worker.env`.
Docker access is powerful; only the trusted worker/control plane receives it.
The preview reverse proxy must terminate wildcard HTTPS and route to this worker's
loopback gateway. Separate Docker hosts require additional routing support.
Build the workspace image recipe, register the resulting immutable image in
`RYVIX_WORKSPACE_IMAGES` and `RYVIX_WORKSPACE_NODE_IMAGE`. Build
`infrastructure/workspaces/Dockerfile.egress`, register it in the image allowlist,
and set `RYVIX_WORKSPACE_EGRESS_IMAGE`. The old egress-network setting is retired.
Set `RYVIX_PREVIEW_RELAY_IMAGE` to an approved trusted Node image (default node:22-alpine).
Production operators should pin image digests. Run `npm run verify:workspace`
with the Node and egress image variables configured before rollout.

## External checks performed

- The subsequent read-only catalog audit is recorded in
  [MIGRATION_DRIFT_2026_09_30.md](MIGRATION_DRIFT_2026_09_30.md). Inspected artifact
  objects match; browser maintenance grants require ADR-015's new migration.
  Seven numbered migrations are now absent from the ledger. No repair was applied.
- Repository/Vault and enrollment UI checkpoint `8c20fe8` was pushed after all
  local gates passed. Browser and live provider verification remain outstanding.
- Resolved the certificate-chain failure with the official Supabase Root 2021 CA,
  configured only in ignored local environment files. TLS verification stays on.
  A transaction-pooler connection on port 6543 authenticated and completed a
  read-only query and schema/migration inspection. Subsequent connections failed
  intermittently with resets/termination; connectivity is not certified reliable.
- Live ledger contains only the three 20260921 migrations. `task_artifacts` already
  exists without its 20260928 ledger entry. Reconcile its columns, constraints,
  policies and grants before migration repair; do not blindly replay or mark applied.
- Docker Linux engine is now available. Built Node and egress verification images.
  Real Docker checks passed: non-root/read-only/capability restrictions, file access,
  path/symlink denial, Git diff measurement, default/direct outbound denial,
  npm registry access through the broker, metadata denial, broker removal,
  preview grant exchange/proxying and recovery cleanup of an unpersisted relay.
- Cross-built the native agent for Linux amd64/arm64. Its amd64 binary collected
  actual CPU/memory/disk measurements in an unprivileged Linux Docker container.
- Database URL and OTP encryption secret are configured (values not displayed).
- Preview domain/signing secret, public application URL, agent release manifest,
  and production workspace/broker image configuration remain missing.
- No live migration, credential rotation, repository mutation, server enrollment,
  public HTTPS preview, deployment or real server operation was certified.

## Local verification

- `npm test`: 64 project suites passed, zero failed; 10 Node scanner/proxy tests passed.
- `npm run typecheck`: passed across all workspaces.
- `npm run lint`: passed with no ESLint warnings/errors (Next lint CLI deprecation notice).
- Real Docker workspace and native Linux agent checks passed as detailed above.
- `npm run build`: passed for web, backend, AI and services.
- Go tests/vet and Linux amd64/arm64 cross-builds passed in this continuation.
- Secret regression scan: zero findings. `git diff --check`: passed.
- All 12 AI runtime-data files restored byte-for-byte from the pre-test backup;
  no AI runtime-data diff remains. User authorized committing and pushing this
  checkpoint to the review branch; the Git history records publication.
- `npm run verify:database`: all 63 live read-only boundary checks passed.
- `npm run verify:tenants`: live SQL database-role fixtures verified cross-tenant
  isolation, viewer write denial, stale profile-role denial, supported profile
  display edits and revoked-membership denial. Fixtures were rolled back and their
  absence checked. This does not certify an actual provider-issued JWT login flow.
- The production observability query ran against the live schema in a read-only
  transaction; an unassigned synthetic identity received no records.
- `npm run verify:deployment`: real SQL event/audit persistence and redelivery
  deduplication passed; all synthetic fixtures were rolled back. This does not
  claim actual GitHub delivery or application deployment.
- Vault create/decrypt and OTP five-attempt SQL smoke tests passed in a rolled-back
  transaction; temporary secret absence was verified afterward.
- Public probe regression checks cover destination denial, mixed DNS answers,
  unauthorized/foreign servers, missing endpoint bindings and stale/missing/future
  heartbeat evidence. A real HTTPS probe to example.com returned HTTP 200.
- `npm run verify:runtime`: not ready; required production settings
  are missing. Database TLS, required tables and migration history checks passed. The check exits nonzero
  for missing settings/tables/migration ledger entries, even when TLS connects.

## Remaining implementation and integration work

- Live OAuth/PAT-to-Vault-to-worker verification after the completed migration rollout;
  shared multi-repository projects retain Connections management (ADR-014).
  Per-repository credential bindings within shared projects remain unimplemented.
- Browser interaction verification for the restored onboarding modals remains
  outstanding; typecheck/build do not establish visual/browser correctness.
- Gmail OAuth/provider delivery, authorized sender mapping and idempotent inbound
  processing; WhatsApp signed gateway and approved commands.
- Live GitHub deployment webhook delivery and verified runtime health correlation;
  durable signed-event ingestion is implemented and SQL-verified.
- Authenticated server-command dispatch with persisted approvals and execution receipts.
- Full tenant/RLS review beyond the protected tables; supported Supabase signup
  provisioning and other historical API paths still need review.
- Public preview browser integration/resource limits and multi-host routing;
  full host enrollment/ingestion beyond the verified native collection and Docker tests.
- Repository-wide remaining mock/demo classification, marketing claims and
  performance methodology review. Historical test labels are not live evidence.

These are explicit remaining items, not claimed completed by local test success.
