# Production remediation progress

Status (2026-09-29): Phase 0 audited; implementation in progress across the user's
prioritized dashboard/task/sandbox/PR/preview/connection batch. This document supersedes historical
claims of complete production readiness for the remediation work. No live
end-to-end flow has been certified.

## Current implementation inventory

The user authorized continuing the prioritized feature batch despite the external
credential-rotation blocker. The user has authorized a checkpoint commit and push
of the current implementation, followed by continued remediation. A code review on
2026-09-28 found the progress documents stale; this inventory corrects that.

| Area | Local changes | Remaining validation/work |
| --- | --- | --- |
| Dashboard | Tenant-scoped monitoring endpoint; fabricated incidents, security/audit events, random latency, example diffs and deployment timeline removed; failures surfaced | Remaining status/display assumptions, stale caches and true deployment history; live RLS verification |
| Diff pipeline | Actual Git diff capture and counts; task_artifacts migration; persisted file content read by dashboard | Apply migration; test real repository lifecycle and artifact immutability under concurrent operations |
| PR shipping | Both UIs call real service; persisted PR number/URL/branch/SHA; stale base check; branch/PR retry reconciliation | Live GitHub test and failure/retry coverage, task state/approval boundaries |
| Sandbox | GitHub access/metadata, shallow clone, stack detection, real provider changes and sandbox checks | Approved images with Git; actual egress policy; Docker live run; durable worker execution instead of long web requests; cleanup/restart recovery |
| Preview | Loopback gateway, signed grants, tenant-checked launch route, expiry and application readiness | Dedicated worker routing; reload URLs; DNS/TLS; proxy/iframe integration tests; headers and resource limits review |
| Connections | Persisted create/read/update/revoke, Vault storage, GitHub token verification, audit transaction, environment-scoped UI; tasks resolve persisted project credentials | Apply Vault boundary migration; live reload/revoke/rotation verification; dedicated non-GitHub provider flows |
| Server telemetry display | Server GET now joins tenant membership and latest persisted rollup; nullable metrics, two-minute freshness, actual service inventory and visible query errors; server UI handles missing/stale samples. Native agent rejects collection failures and unsupported operating systems instead of inventing readings | Live database verification; legacy rollup authenticity is not established until ingestion is secured; uptime/network unavailable without measured provenance; Linux runtime collector test |
| Streaming/installer/diagnostics | Existing baseline code inspected | Still pending: unauthenticated ingestion with fabricated defaults, unpersisted enrollment credentials, streaming, installer, canned chat data and demo identities |

New design records: ADR-007 (task artifacts) and ADR-008 (connection Vault).
New migrations are prepared locally only. Do not deploy routes depending on them
without applying and validating the migrations first. The preview gateway currently
requires a configured HTTPS wildcard domain; the development example domain is not
valid production configuration.

Connection checkpoint: 48 suites passed, 0 failed; typecheck, lint, secret scan and
all production workspace builds passed. Server telemetry display checkpoint:
49 suites passed, 0 failed; typecheck, lint, secret scan and all production workspace
builds passed. Native Go tests and vet passed on Windows; Linux amd64 cross-build
passed (not a Linux runtime test). Tracked AI runtime data was restored from the
pre-verification backup after tests/builds. Connection tests cover authorization, Vault failure rollback,
safe output and revocation using external I/O adapters. Telemetry tests cover zero,
missing/invalid/stale samples, scoped queries, unauthorized access and database failures.
These checks do not prove live infrastructure connectivity.

Next telemetry work must address the entire trust chain: the existing registration
route returns an unpersisted credential and uses schema-incompatible connector
values; ingestion accepts browser-provided server IDs and inserts fallback metrics;
the Go dispatcher accepts malformed success responses; collector service/container
inventory adapters need a separate mock audit. Preserve the existing native agent,
connector tables and rollup pipeline. The current changes do not certify enrollment,
device authentication, continuous streaming or server command execution.

The training-loss report now evaluates the same sample set before and after
training instead of comparing online losses collected while weights change.
No latency/performance threshold was loosened. Tests asserting a localhost URL
immediately after container creation now correctly require a null preview until
the application and gateway are ready.

## Workspace recovery

On 2026-09-28 the working directory disappeared during Phase 1. At the user's
request, `https://github.com/chaitanyareddykarri/ryvix.git` was cloned into
`D:\Ryvix`. The recovered baseline is `1dc1aa9`. Work continues on
`fix/production-remediation`. Uncommitted security fixes were reapplied and
expanded with regression coverage. Ignored environment files were not recoverable
from Git; the previously exposed database password was deliberately not restored.

## Phase 0: audit findings

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

## Phase 1: local changes

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

## Phase 1: remaining blockers and review findings

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
- OTP attempt limits, one-time consumption and invalidation of superseded resend
  challenges still need durable server-side enforcement. These changes retain
  the existing encrypted-cookie architecture and do not claim to solve replay.
- Remaining Phase 1 security work includes trusted tenant resolution across APIs,
  profile privilege protection, role-aware RLS, persisted action approvals,
  connector identity verification, OAuth secret storage and callback hardening,
  and safe monitoring targets. Database fixes need an ADR and incremental migration.

## Ordered remediation checklist

Do not begin a later phase until the preceding phase's required checks pass and
its outcome is reported. External blockers remain explicit, not marked complete.

- [x] 0. Baseline audit and dependency map
- [ ] 1. Security, actual credential rotation and authorization verification
- [ ] 2. Dashboard real incidents, security/audit records and latency
- [ ] 3. Persisted generated diffs and real changed-file statistics
- [ ] 4. Authorized real PR shipping through PullRequestService
- [ ] 5. Repository-backed sandbox lifecycle
- [ ] 6. Authenticated, expiring preview gateway
- [ ] 7. Connection create/read/update/revoke persistence
- [ ] 8. Real server metrics and freshness
- [ ] 9. Authenticated continuous telemetry ingestion/streaming
- [ ] 10. Versioned, integrity-checked installer and single-use enrollment
- [ ] 11. AI diagnostics from authorized measured data
- [ ] 12. Chat preview using the same secure gateway
- [ ] 13. Verified WhatsApp gateway and authorized commands
- [ ] 14. Gmail OAuth, verified inbound processing and replies
- [ ] 15. Final demo identity removal
- [ ] 16. Reference-checked dead-code cleanup
- [ ] 17. Orphan/temp-file review
- [ ] 18. Truthful marketing claims
- [ ] 19. Full tests and performance methodology review
- [ ] 20. Live end-to-end flows A–G
- [ ] 21. Final repository-wide mock classification/removal
- [ ] 22. Final typecheck, lint, tests, builds, database/security/diff gates

Dependencies: trusted identity and credentials precede every integration;
repository content and persisted changes feed PR shipping and previews;
authenticated telemetry feeds dashboard and diagnostics; communication channels
reuse the same authorized operations and durable approval/audit records.
