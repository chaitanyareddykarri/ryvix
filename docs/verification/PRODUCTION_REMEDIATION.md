# Production remediation progress

Live rollout supersedes pending-migration notes below:
[migration rollout](MIGRATION_ROLLOUT_2026_09_30.md). The artifact ledger entry was
repaired and six pending migrations applied; all 31 database-boundary checks pass.
Production preview/release/image configuration and live integrations remain pending.

Latest catalog findings: [migration drift inspection](MIGRATION_DRIFT_2026_09_30.md).
Checkpoints `8203118` and `8c20fe8` are pushed. An additional migration prepared
under ADR-015 removes browser table-maintenance grants, bringing pending ledger
entries to seven. No live migration/history repair has been applied.

Latest continuation: [2026-09-30 checkpoint](COMPLETION_2026_09_30.md) supersedes
the older inventory below. Durable OTP limits, repository queue/worker, lifecycle
cleanup and additional security fixes are now implemented locally. External
verification and the explicitly listed remaining integrations are not complete.
Checkpoint `8203118` is pushed. The following batch fixes repository-selection
Vault persistence and schema-key errors, removes fictitious App installation
records from OAuth/PAT flows, checks wizard save errors, and restores the signed
server enrollment modal's styling/copy controls. See ADR-014 for shared-project
limitations. The latest verified-TLS read-only database probe passed, but six
migration ledger entries and required production settings are still absent.

Status (2026-09-29): Phase 0 audited; implementation in progress across the user's
prioritized dashboard/task/sandbox/PR/preview/connection batch. This document supersedes historical
claims of complete production readiness for the remediation work. No live
end-to-end flow has been certified.

## Earlier remediation checkpoints (historical)

The dated test counts and pending-work statements in this section describe earlier
checkpoints. The current implementation and verification state is recorded in
[COMPLETION_2026_09_30.md](COMPLETION_2026_09_30.md); use that checkpoint for status.

- ADR-009 / migration 20260929000002 adds single-use server-bound enrollment,
  device public keys and replay receipts. Native Go agent signs bounded HTTPS
  payloads; ingestion verifies key, signature, timestamp, nonce, revocation and
  rate before committing existing minute rollups. Missing metrics are rejected.
  Legacy rollups are not automatically certified. 51 suites and all local gates passed.
- Browser SSE reads the same tenant-scoped rollups with per-user connection limits,
  reauthorization, backpressure and expiry. Agent retries back off after failure.
  The installer requires a pinned release manifest, verifies SHA-256 before execution,
  reads the short-lived token interactively and runs an unprivileged systemd service.
  Enrollment UI selects a persisted environment and waits for its exact server.
  53 suites, typecheck/lint/build, Go tests/vet and secret scan passed.
- Chat now retrieves scoped measured telemetry, health, incidents, security and
  deployment audit activity through the existing model gateway with requireProvider.
  Browser identities, canned operational claims, global chat memory and synthetic
  approval/diff output were removed from that route. Missing deployment-result
  integration is explicitly reported. 54 suites and all local gates passed.
- Task GET restores persisted workspace launch links; chat can select a task's
  real diff/preview. Workspace listing verifies membership and returns launch routes.
  Generic sandbox creation is rejected in favor of the repository task pipeline.
  PR shipping reuses its transaction connection and reads existing PRs before
  requiring credentials. Sandbox reads/writes/deletes reject symlink parents.
  Preview frame ancestors are limited to the configured application origin.

Live checks: DATABASE_URL is configured but a verified-TLS read-only connection
attempt failed. PREVIEW_BASE_DOMAIN, PREVIEW_SIGNING_SECRET, RYVIX_PUBLIC_URL and
RYVIX_AGENT_RELEASE_MANIFEST were not configured. No migrations, published agent,
live telemetry, preview, PR, credential rotation or external end-to-end flow was
certified. WhatsApp/Gmail and durable deployment-result ingestion remain pending.

Checkpoint `3038b27` was pushed to `fix/production-remediation` on 2026-09-29.
Subsequent local Antigravity review found credential-guessing probe scripts,
TLS verification disabled in a migration helper, and suppressed Vault revocation
errors. Credential literals were removed from the probes during review; the probe
files are no longer present. The numbered Vault migration again fails on errors.
The duplicate SQL bundle and ad-hoc runner now refuse execution; use the canonical
numbered migrations with migration-history reconciliation. The local development
origin addition was preserved. No live migration or credential rotation is inferred
from these files. The secret scanner now tests single/multiline password arrays
without reporting their values (6 secret tests passed; scan: 0 findings).
The full local master runner passed 49 suites, 0 failed; typecheck, lint and all
workspace production builds passed. Go tests/vet passed. Tracked AI runtime data
was preserved through verification; diff whitespace and secret checks passed.

## Historical implementation inventory (updated by the 2026-09-30 checkpoint)

This inventory summarizes local implementation and outstanding validation. Earlier
authorization and review notes below are retained as project history; current task
scope and live-readiness status are in the latest checkpoint.

| Area | Local changes | Remaining validation/work |
| --- | --- | --- |
| Dashboard and diagnostics | Tenant-scoped persisted monitoring and measured context are used; fabricated dashboard records and chat identities were removed | Full live RLS validation, deployment history ingestion and remaining historical API review |
| Diff and repository tasks | Measured Git diffs and persisted artifacts; durable repository queue/worker, cancellation, authorization rechecks and cleanup recovery | Apply/reconcile migrations, configure worker/Vault credentials and verify against an authorized live test repository |
| PR shipping | Persisted approval/audit before GitHub writes; task authorization rechecked | Live GitHub repository flow and failure/retry behavior remain uncertified |
| Sandbox and preview | Docker isolation, restricted registry egress broker, signed preview grants, loopback relay and restart cleanup passed real local Docker checks | Production image/configuration, public HTTPS routing, browser integration, resource review and multi-host routing |
| Connections and OAuth | Existing connector persistence/Vault path and GitHub OAuth checks were hardened | Apply Vault migration, validate live RLS, credential rotation and provider-specific flows |
| Telemetry and installer | Signed device enrollment/telemetry, SSE, pinned installer flow and actual Linux agent measurements are implemented locally | Apply migration, configure/publish release manifest, validate live enrollment and complete authenticated server operations |
| Gmail and WhatsApp | Gmail sender spoofing is blocked; unsafe digest output is escaped | Verified Gmail provider/OAuth/idempotency and WhatsApp signed gateway/approved commands remain unimplemented |

New design records: ADR-007 through ADR-014. Migrations are prepared locally only.
The live migration ledger and pre-existing `task_artifacts` table disagree; reconcile
that drift before applying migrations. Do not deploy routes depending on these changes
until migrations and grants are validated. The preview gateway needs a production
HTTPS wildcard domain and trusted worker routing.

Connection checkpoint: 48 suites passed, 0 failed; typecheck, lint, secret scan and
all production workspace builds passed. Server telemetry display checkpoint:
49 suites passed, 0 failed; typecheck, lint, secret scan and all production workspace
builds passed. Native Go tests and vet passed on Windows; Linux amd64 cross-build
passed (not a Linux runtime test). These counts and pending-work statements are
historical. Current local test, typecheck, lint, build, Go, Docker and secret-scan
results are in [COMPLETION_2026_09_30.md](COMPLETION_2026_09_30.md). Local checks do
not establish production database connectivity, live tenant policies, provider
integrations or public HTTPS routing.

## Workspace recovery

On 2026-09-28 the working directory disappeared during Phase 1. At the user's
request, `https://github.com/chaitanyareddykarri/ryvix.git` was cloned into
`D:\Ryvix`. The recovered baseline is `1dc1aa9`. Work continues on
`fix/production-remediation`. Uncommitted security fixes were reapplied and
expanded with regression coverage. Ignored environment files were not recoverable
from Git; the previously exposed database password was deliberately not restored.

## Phase 0: audit findings (historical)

The repository includes five npm workspaces (`web`, `backend`, `ai`, `services`,
`packages/database`), a Go agent (`agent`), SQL migrations, TypeScript and Go tests,
GitHub Actions CI/CD, and Docker production configuration.

| Area | Existing implementation | Remediation needed |
| --- | --- | --- |
| Docker | `services/src/workspace/docker-workspace.manager.ts` invokes Docker with resource limits and an unprivileged user | Task route must load the real repository, apply verified changes, persist results, and start an actual preview |
| Pull requests | `backend/src/services/pr.service.ts` calls GitHub trees, commits, refs and pull APIs | Tasks UI fabricates PRs instead of invoking and persisting this service's result |
| AI | Gateway and coding assistant exist | Coding fallback diffs and canned diagnostics must not be represented as executed or measured results |
| Dashboard | Reads some database/API resources | Fabricates incidents, security/audit events, latency, diffs, deployment history and preview URLs |
| Health tools | Typed tool interfaces exist | `services/src/health-query-tools.ts` seeds demo records; callers use default demo server identities |
| Connections | Reads connector metadata | POST returns success without persistence; lifecycle and encrypted credential storage are incomplete |
| Servers | Server schema, management routes and recovery services exist | Metrics are formulas/defaults; authorization and operation completion need verification |
| Telemetry | Rollup schema, ingestion route and native Go collection exist | Device authentication, replay protection, real sampling and ingestion error handling are incomplete |
| Authentication | Supabase session integration and OTP challenge flows exist | Public-key/default challenge encryption, invalid resend handling and false successful session responses were confirmed |
| Authorization | Some routes use authenticated users and project membership | Chat trusts supplied identity; other mutation routes lack complete membership checks; profile/approval RLS and privileged SQL paths need hardening |
| GitHub | Real API calls and OAuth/PAT routes exist | Access must be validated server-side; credential storage, callback logging and approval persistence need review |
| Gmail | Digest formatting and an inbound-task method exist | Inbound sender currently resolves to the first profile; verified delivery, OAuth, mapping and idempotency are missing |
| WhatsApp | Specification exists | Verified gateway and authorized actions are missing |
| Tests | Baseline runner registered 42 suites | Several suites simulate auth, RLS and execution; passing does not establish live connectivity |

Baseline results before directory loss: 42 suites passed, 0 failed; typecheck,
lint and production build passed. Runtime data was restored byte-for-byte.
The checked-out neural latency assertion is already 1 ms; no threshold change is
part of this remediation. Docker's Linux engine was unavailable during the audit.

The source and configuration search covered random values, localhost previews,
demo identities, fixed UUIDs, fabricated incidents/security events, static
deployments, and fake/mock/fallback markers. Test fixtures, documentation examples,
UI input placeholders, randomized numerical algorithms and decorative graphics
must be classified separately from fabricated production results.

## Phase 1: local changes at the earlier checkpoint (historical)

- OTP challenge encryption requires a dedicated `AUTH_CHALLENGE_SECRET` containing
  32 random bytes encoded as 64 hexadecimal characters. No public-key or known
  string fallback remains. The module is protected by `server-only`; display
  formatting moved to a browser-safe module.
- Challenges are bound to login/signup purpose and email, validate payload shape,
  reject future/expired timestamps, and compare OTPs using a timing-safe operation.
- Resends validate before sending email, preserve login credentials and signup
  details, and retain the original expiry.
- Login and signup return an error when Supabase does not establish a session
  and return an authenticated user. Password-free login challenges cannot succeed.
- Unused legacy challenge aliases were removed after repository-wide reference
  inspection because they could validate a challenge without checking an OTP.
- Environment ignore rules cover environment variants; Docker contexts exclude
  nested environment files.
- A focused secret regression scanner reports only locations and rule names.
  Exact hashed exceptions cover three reviewed lines in secret-redaction tests;
  changing their content invalidates the exception. This is not an exhaustive
  secret-detection system or a substitute for credential rotation.
- CI runs the secret scan, lint and the full npm test command.
- PostCSS override updated from 8.5.3 to 8.5.28 without changing Next.js major
  version. Dependency audit after installation reported zero vulnerabilities.

## Phase 1: blockers and review findings at the earlier checkpoint (historical)

- **Actual database password rotation is NOT complete.** The audit found the
  locally configured password in historical versions of six web API routes at
  `27079066fc9b`. No credential value was printed. Current tracked production
  files do not contain that connection string.
- Supabase management access is required to reset the actual password using the
  [supported management endpoint](https://supabase.com/docs/reference/api/v1-update-database-password)
  or dashboard. Updating an environment file alone is insufficient. Verify new
  connections and rejection of the old password; update all deployment consumers.
- Before the workspace loss, a read-only connection attempt using certificate
  verification failed with `SELF_SIGNED_CERT_IN_CHAIN`. Live database state was
  not verified; do not disable TLS verification to claim success.
- Supabase/GitHub plugins were not connected at audit time. The recovered workspace
  has no database/provider environment configuration. CI workflow files were
  inspected, but remote secret settings and the production runner's runtime env
  file have not been verified or updated.
- Configure the new OTP key in ignored local configuration and the deployment's
  secret store before serving authentication. Key changes invalidate outstanding
  challenge cookies; users must start login/signup again.
- At that checkpoint, OTP attempt limits, one-time consumption and resend
  invalidation still needed durable server-side enforcement. ADR-010 and the
  20260930000001 migration now implement the durable challenge ledger locally;
  apply and validate the migration before deployment.
- Remaining Phase 1 security work includes trusted tenant resolution across APIs,
  profile privilege protection, role-aware RLS, persisted action approvals,
  connector identity verification, OAuth secret storage and callback hardening,
  and safe monitoring targets. Database fixes need an ADR and incremental migration.

## Current remediation checklist

“Implemented locally” describes code and local verification only. It does not
mean deployed or validated against production/customer systems.

| Work area | Current state | Still required |
| --- | --- | --- |
| Baseline audit and dependency map | Complete | Revisit when external system state changes |
| Security, authorization and credential rotation | Hardening implemented locally | Reconcile/apply migrations, validate all RLS/API paths, rotate credentials in provider control planes |
| Dashboard, diagnostics and task artifacts | Persisted tenant-scoped paths implemented locally | Live RLS/database validation and deployment-result ingestion |
| PR shipping | Approval/audit boundary and persisted result implemented locally | Authorized live GitHub repository flow and retry/failure verification |
| Repository sandbox and lifecycle | Durable worker, cancellation, measured diffs and cleanup recovery implemented; Docker isolation tested locally | Configure production worker/images/Vault access and test an authorized repository |
| Preview gateway | Signed grants and relay passed local Docker checks | Configure wildcard DNS/TLS and public proxy; browser flow and multi-host routing |
| Connections and OAuth | Existing persistence and GitHub OAuth paths hardened locally | Apply Vault migration; validate live policies, rotation and other provider flows |
| Device telemetry, streaming and installer | Signed enrollment/ingestion, SSE, installer and Linux collection implemented locally | Apply migration, publish pinned release manifest and verify live enrollment |
| Authenticated server operations | Unsafe unauthenticated execution is rejected | Implement durable approvals, authenticated dispatch and execution receipts |
| Gmail and WhatsApp | Gmail spoofing defenses implemented; inbound task creation remains disabled | Verified Gmail provider/OAuth/idempotency and WhatsApp signed gateway/approved commands |
| Cleanup, mock review and marketing | Some simulations moved to test fixtures; README readiness claims corrected | Complete repository-wide review and substantiate remaining claims |
| Verification | Local tests, typecheck, lint, build, Go, secret-scan and Docker checks passed | Reliable database connection, schema reconciliation, live flows and performance methodology |

Dependencies: trusted identity and credentials precede every integration;
repository content and persisted changes feed PR shipping and previews;
authenticated telemetry feeds dashboard and diagnostics; communication channels
reuse the same authorized operations and durable approval/audit records.
