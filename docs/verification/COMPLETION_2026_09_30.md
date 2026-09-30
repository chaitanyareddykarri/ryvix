# Remediation checkpoint — 2026-09-30

## Implemented in this continuation

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

Reconcile migration history and apply canonical numbered migrations in order,
including the earlier task-artifact, Vault and signed-telemetry migrations plus:

1. `20260930000001_auth_challenge_limits.sql`
2. `20260930000002_repository_jobs.sql`
3. `20260930000003_protected_workflow_records.sql`

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

- `npm test`: 60 project suites passed, zero failed; 10 Node scanner/proxy tests passed.
- `npm run typecheck`: passed across all workspaces.
- `npm run lint`: passed with no ESLint warnings/errors (Next lint CLI deprecation notice).
- Real Docker workspace and native Linux agent checks passed as detailed above.
- `npm run build`: passed for web, backend, AI and services.
- Go tests/vet and Linux amd64/arm64 cross-builds passed in this continuation.
- Secret regression scan: zero findings. `git diff --check`: passed.
- All 12 AI runtime-data files restored byte-for-byte from the pre-test backup;
  no AI runtime-data diff remains. User authorized committing and pushing this
  checkpoint to the review branch; the Git history records publication.
- `npm run verify:runtime`: not ready; required production settings and migrations
  are missing. The latest database verified-TLS read-only probe passed. The check exits nonzero
  for missing settings/tables/migration ledger entries, even when TLS connects.

## Remaining implementation and integration work

- Live OAuth/PAT-to-Vault-to-worker verification after migration reconciliation;
  shared multi-repository projects retain Connections management (ADR-014).
  Per-repository credential bindings within shared projects remain unimplemented.
- Browser interaction verification for the restored onboarding modals remains
  outstanding; typecheck/build do not establish visual/browser correctness.
- Gmail OAuth/provider delivery, authorized sender mapping and idempotent inbound
  processing; WhatsApp signed gateway and approved commands.
- Durable deployment-result ingestion and verified runtime health correlation.
- Authenticated server-command dispatch with persisted approvals and execution receipts.
- Full tenant/RLS review beyond the protected tables; supported Supabase signup
  provisioning and other historical API paths still need review.
- Public preview browser integration/resource limits and multi-host routing;
  full host enrollment/ingestion beyond the verified native collection and Docker tests.
- Repository-wide remaining mock/demo classification, marketing claims and
  performance methodology review. Historical test labels are not live evidence.

These are explicit remaining items, not claimed completed by local test success.
