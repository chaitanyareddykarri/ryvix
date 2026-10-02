# Consolidated continuation: 2026-10-01 through 2026-10-02

## Latest checkpoint

Local implementation and verification progressed; full production rollout is
still incomplete. Existing work was preserved. The subsequent user request to
publish to main is tracked in `MAIN_CHECKLIST_2026_10_02.md`.

| Work item | Current evidence | Remaining |
| --- | --- | --- |
| Security | Transactional settings authorization/audits, scoped Vault-only project GitHub credentials, durable UTC chat quotas; live SQL fixtures passed | Provider-issued JWT/browser verification |
| Chat | Reload/archive UI, commit-pinned repository retrieval, secret exclusion, semantic reranking and tenant-scoped recorded topology; stale history response race fixed | Live provider/embedding configuration, authenticated browser session, answer-quality evaluation |
| Migrations | Prior migrations through 20261001000005 were already applied; this continuation applied 20261001000006, 20261001000007 and 20261002000001 through the existing verified-TLS Supabase CLI workflow | Deployment of matching application/worker revision |
| Gmail/WhatsApp | Reviewed inbound proposals, signed WhatsApp transport, bounded Gmail OAuth polling, reconnect/Vault replacement, deduplication and atomic inbound audits; real SQL fixtures passed | Provider app credentials, OAuth/account setup, public webhook subscription and actual delivery; outbound notifications/mobile approvals remain separate |
| Learning | Independent review, fixed partitions/feature deduplication, protected checkpoints, scheduled training script, explicit promotion/rollback, per-class evaluation metrics; JSON redaction fixed | Real representative reviewed datasets, independent holdout, operational training schedule and drift monitoring; no live model-quality score |
| Native service operations | Independent persisted approvals; expiring signed commands; nonce receipts, service allowlists, cooldowns, Linux durable replay journal and signed measured result; UI at /operations | Pinned keys/allowlists, least-privilege systemd policy and authorized Linux rollout; actual service restart not performed |
| Cloud recovery | Existing unsafe browser reset remains disabled | Separate persisted cloud approval/dispatch/outcome workflow and provider-specific live verification; native command approval does not enable cloud reboot |
| Worker scale/previews | Stable host IDs, process ownership lock, host-scoped cleanup/restore, per-host domain allowlist; web no longer invokes Docker on preview launch | Production image review/configuration, designated hosts, wildcard DNS/TLS, signing secret, live multi-host routing and reconciliation of historical unowned sessions |
| Deployment/runtime correlation | Explicit repository/provider-environment/endpoint mapping, bounded public probes, persistent timestamped observations with reauthorization; /deployments UI and chat context | Actual GitHub webhook delivery and real endpoint checks; reachability is not executing-commit proof |
| Runtime data | Original 12 ai/data files restored and SHA-256 checked against the start-of-session backup | Existing pre-session dirty data remains intentionally uncommitted |

## Final verification evidence

- `npm test`: 73 project suites, zero failures, plus 15 Node checks. These include
  explicit fixtures and are not certification of live external services.
- Workspace typecheck, lint and full production build passed.
- Secret regression scan: zero findings. Whitespace diff check passed.
- `npm run verify:database`: **87** read-only checks passed; all numbered migrations
  are recorded, public-table RLS is enabled and protected tables deny browser writes.
- `npm run verify:chat`: real SQL history/isolation, settings/audit and request-budget
  fixtures passed and were rolled back; not a provider-issued JWT/browser login.
- `npm run verify:channels-learning`: real SQL reconnect/Vault, inbox deduplication,
  reviewed task insertion, independent review and feature-partition boundaries;
  fixture data rolled back. Checkpoint lifecycle is tested with explicitly seeded
  fixture weights, not measured production accuracy.
- `npm run verify:operations`: real SQL independent approval, approver revocation,
  signed delivery, replay denial, receipt deduplication, cooldown, host cleanup
  isolation, deployment mapping and post-probe reauthorization passed. All fixtures
  rolled back; probe output injected and no real operation executed.
- Go tests and vet passed on Windows. Four command tests passed in a Linux,
  unprivileged, network-disabled container, including durable crash/replay cases.
- `npm run verify:workspace`: real Docker isolation, file/symlink boundaries, Git
  diffs, registry-broker access, prohibited egress, loopback preview grants/proxy,
  and recovery cleanup passed using installed verification images. No public TLS
  or live repository/provider/PR flow was tested.
- `npm run eval:ai -- --live`: unavailable; no configured live model, no quality score.

## External inputs still required

The user has not identified the deployment/test hosts, public app and preview
domains or authorized GitHub test repository. The inspected runtime configuration
lacks cloud model and embedding credentials, Gmail/WhatsApp app configuration,
preview signing/public URL/release manifest and production worker configuration.
Supabase service-role credentials for provisioning a real test login were also
absent. No authenticated browser session or representative held-out dataset was
provided. Docker Desktop was started for local checks and its engine is available.

See [worker deployment](../infrastructure/WORKER_DEPLOYMENT.md),
[approved service operations](../infrastructure/APPROVED_SERVICE_OPERATIONS.md),
and [channels/learning rollout](../infrastructure/CHANNELS_AND_LEARNING.md).
Migration preview/apply used the documented
[Supabase CLI workflow](https://supabase.com/docs/guides/local-development/cli-workflows)
with the existing credential-safe helper. No reset, seed or migration-history repair
was performed in this continuation.

This is the execution checklist for the user's requested continuation. A local
implementation, fixture test, live database check and production verification are
different milestones. The subsequent October 2 request authorizes commit and
publication to main; generated runtime data remains excluded.

## Work order

1. Preserve existing runtime data; review and verify the unfinished security/chat
   batch. Fix transactional settings authorization, credential scope, durable chat
   budgets, history restoration, repository retrieval and authorized retrieval.
2. Inspect the live migration ledger and database boundaries. Apply only reviewed
   missing migrations through the established workflow; do not replay applied SQL.
3. Complete/review channel inbox and controlled learning code. Verify tenant,
   approval, replay, partition and checkpoint boundaries. Exercise real accounts
   and representative held-out data only when available.
4. Implement durable server approvals, signed expiring device-bound commands,
   replay rejection, signed receipts and independently measured outcomes.
5. Implement durable worker-host ownership, scoped cleanup and preview routing.
6. Configure the designated deployment and verify actual clone, provider changes,
   checks, preview, approved PR, webhook, health correlation and agent enrollment.
7. Run final relevant checks, restore preserved runtime data, and update this
   checkpoint and CURRENT_TASK with exact results and remaining external inputs.

## Initial evidence (superseded by the checkpoint above)

- Baseline commit: ac25a7d on fix/production-remediation; existing local changes
  preserved. Runtime backup location is recorded in ignored
  tmp/continuation-backup-path.txt.
- Workspace typecheck passed.
- Baseline tests: 69 project suites passed, one synthetic-training suite failed;
  15 Node checks passed. Investigating shared classifier state in that failure.
- Verified-TLS live read-only check: all numbered migrations through
  20261001000005 already recorded. No migration was applied in this continuation.
- All then-current live database boundary checks passed; the final measured count
  after subsequent migrations is 87.
- Runtime configuration lacks cloud model credentials, preview domain/signing,
  public URL, agent release manifest and workspace images/allowlist.
- Requested designated worker/test hosts, domains and authorized repository from
  the user. These are required to certify the external rollout.
