# Ryvix project status

## Deployment checkpoint - October 10, 2026

Step 1 host preparation is supported by the user-provided terminal output; no
fresh remote audit is claimed. Step 2 is implemented and locally verified for
the restricted static-only trial. The current batch is on local main and remains
uncommitted/unpublished. See the [recap and ordered Steps 3-7](infrastructure/MICRO_VERCEL_TRIAL.md#progress-through-step-2).
Older dated entries below are historical snapshots, not current branch, schema
or deployment instructions. Broader product backlog remains open.

October 10 Step 2: [two Micro VMs and Vercel restricted trial](infrastructure/MICRO_VERCEL_TRIAL.md).
AMD64 image CI, per-host worker limits/templates, static-only 192 MiB workspaces
and serverless API boundaries are implemented locally. Standard coding workspaces
retain their original limits. No live deployment, credentials, migrations or
publication is implied; see the linked runbook and verification for remaining gates.

Step 2 recheck: fixed Compose temporary-filesystem option parsing and added CI
assertions for resolved host limits/default roles. The
[five-item evidence matrix](verification/MICRO_STEP2_2026_10_10.md) separates local
completion from pending GitHub publication, Vercel/Oracle rollout and acceptance.

October 9 non-deployment implementation: [current evidence and remaining work](verification/NONDEPLOYMENT_2026_10_09.md).
Bounded signed journal logs, inventory persistence, context compaction, pre-plan
quota retries, snapshot compiler resolution and saved usage comparison are added.
Two new migrations are rollback-tested but not applied. Reviewed datasets have
zero approved examples; broader analysis/scanning, external training
and concurrency acceptance remain open. The lint dependency chain is replaced;
see current evidence for final audit results. Older statements below about
missing quota/context functionality or zero pending migrations are superseded.

October 8 Oracle phase 1 implementation: [verification](verification/ORACLE_PHASE1_2026_10_08.md)
and [release runbook](infrastructure/ORACLE_RELEASE_RUNBOOK.md). Deployment code
is local on Testing_branch. Native CI and actual host/provider acceptance remain
pending; no cloud infrastructure or production release was changed.

Historical deployment plan (October 8): [Oracle pilot rollout](infrastructure/ORACLE_PILOT_DEPLOYMENT.md).
Oracle hosts Next.js UI/APIs and separate workers; Supabase stays hosted and
model inference uses an external API. Finish ARM64/resource/deployment work,
prepare accounts in parallel, then activate providers on a restricted HTTPS
deployment before public launch. The plan records acceptance gates and does not
claim that infrastructure or real integrations are deployed.

October 8 dependency follow-up: [current audit](verification/DEPENDENCIES_2026_10_08.md). Next patched to
15.5.27; missing runtime/development declarations corrected; unused web artifact
writer removed. Production audit is clean; five development-chain findings remain.
Publication target: Testing_branch. Promotion to main is a separate manual step.

October 8 operations cleanup: [scripts guide](SCRIPTS_GUIDE.md) and
[worker plan](infrastructure/WORKER_OPERATIONS.md). Added sequential
verify:all, bounded per-worker pool caps and optional systemd grouping. Kept
separate worker processes/session locks; unified-daemon RAM/free-tier guarantees
were unsupported. SMTP remains in services; duplicate web declarations removed.
Host deployment and representative resource measurements remain pending.

Latest [worker/HTTP/CI follow-up](verification/WORKER_HTTP_CI_2026_10_07.md) centralizes safe worker pools,
bounds repository inspection and fixes the Linux 320px Tasks overflow.
Testing-branch CI verification precedes main promotion. Missing infrastructure
and provider configuration remain separate external requirements.

Latest [pre-publish cross-check](verification/PREPUBLISH_2026_10_07.md) corrects
remaining approval/preview evidence labels and updates vulnerable sharp. Five
unpatched development-chain audit findings and missing runtime/provider settings
remain open. See the [main/testing workflow](BRANCH_WORKFLOW.md).

Updated October 7, 2026. This is the current implementation index; dated reports
retain checkpoint-specific results. Local working changes are not a published
release. Hosted migrations are applied through `20261007000001`, with no pending
numbered files. See [remaining work](PENDING_WORK.md).

## Latest completed work

- Phone saving without Meta, recurring dashboard reminder until a number is saved,
  direct profile access and explicit WhatsApp OTP verification controls. Saving
  a number does not verify WhatsApp possession or opt in to messaging.
- Dashboard styling across new operational/profile UI, responsive phone/fleet
  layouts, operational navigation, recorded deployments and API-key revocation.
- Team invitation/role/removal flows, bounded repository stack inspection,
  server utilities/classification and scoped read-only API-key server access.
- Dashboard saved-chat restoration and persisted repository website URL; removed
  rejected threat diagnosis controls and unsupported deployment progress claims.
- Google sign-in/sign-up button alongside manual login, account chooser request,
  PKCE callback, workspace validation and authentication error recovery. Provider
  activation remains deferred until deployment.
- RYVIX brand opens home; Manage Server Fleet opens /servers; Dashboard returns
  to /dashboard. Fleet handles unknown/stale/error states and stream races.
- Server enrollment can explicitly create a tenant-scoped project/environment
  without GitHub. Enrollment and approved operations remain separate actions.
- Team invitations and repository URL migrations applied to hosted Supabase;
  browser restrictions, service access, RLS and URL constraint verified.

## Implemented changes

| Area | Implemented behavior | Remaining boundary |
| --- | --- | --- |
| Security | Settings membership lock, mutation and audit share a transaction; project GitHub credentials resolve through Vault; durable chat quotas | Exercise deployed authentication and provider flows |
| Chat | Conversation reload/archive, tenant-scoped retrieval, bounded commit-pinned files, optional embeddings/static dependency neighbors, provider-reported usage and configured-rate estimates | Bounded snapshots are not full compiler graphs; live streaming/answer review and invoice billing remain pending |
| Native operations | Independent persisted approval, signed expiring commands, nonce receipts, Linux replay journal, service allowlists, cooldowns and measured service-state receipts | Enroll a deployed agent and verify an approved restart; service state is not application health |
| Cloud recovery | Independent approval of a frozen allowlisted target, durable one-attempt reboot dispatch, cooldowns, provider outcomes and heartbeat observation | Configure scoped cloud account/test host and verify an actual approved reboot; observed liveness does not prove a reboot |
| WhatsApp | OTP identity, opt-in assistant, durable replies/history/quotas, authorized answers/status, confirmed coding requests, task notifications and P1 alerts | Real Meta OTP/reply/template delivery and browser acceptance; release/server approvals remain authenticated web handoffs |
| Gmail | Vault-backed manual/scheduled polling, authenticated Pub/Sub intake/watch renewal, separately granted and explicitly reviewed replies | Real Google/Pub/Sub delivery and deployed browser verification |
| Experience and repository knowledge | Explicit memory/corrections, opt-in outcomes, reviewed lessons, bounded text/semantic retrieval and static references across common languages | Representative data and retrieval quality; arbitrary language/compiler analysis and whole-repository graph coverage are not established |
| Account email | `/notifications` opt-in per environment; durable SMTP sends to confirmed account email, including Gmail; security and approved-release results | Authorized SMTP sender/credentials, actual detector and inbox verification; provider acceptance is not delivery |
| Releases | `/releases` owner/admin approval of exact reviewed head and mapping version; protected default branch and successful checks; bounded merge and read-only reconciliation | Existing customer CI/CD performs deployment; real approved release/webhook/runtime/browser acceptance pending |
| Worker scale | Stable host ownership, host-scoped cleanup, advisory process lock and allowlisted preview host routing | Configure images/domains/TLS and verify multiple deployed hosts |
| Reviewed learning | Tenant examples, independent labels, immutable splits, held-out metrics, gated promotion and rollback | Representative reviewed data, measured real quality and drift monitoring; legacy memory/weights are not training evidence |
| External training | Separate consented question/answer examples, independent review, partition checks and gated provider-neutral export | Provider/model choice, paid-job adapter/approval, measured evaluation and external-model rollout remain pending |
| Additional P1 transports | Slack, PagerDuty and Twilio SMS durable dispatch, Vault secrets, current permission checks and acceptance history | Real accounts/consent, delivery verification and provider delivery receipts |
| Persisted AI IDs | Cryptographic UUIDs in semantic memory, long-term memory, semantic cache and risk alert dispatcher | Existing runtime JSON remains outside source commits |

## Security alerts and website release flow

Security: trusted detector → enrolled agent's signed `/api/connector/security`
report → persisted security event → eligible user preference → durable outbox →
Configured SMTP → confirmed account mailbox. Reporting does not install a WAF or detect
every attack automatically. Email contains references and application links, not
raw evidence or credentials.

Website: AI changes → Docker checks → user reviews preview/diff → approved PR →
owner/admin approves exact release → GitHub merge → existing CI/CD → signed
`deployment_status` event matching repository, environment and actual merge SHA →
success/failure email. A preview, PR or merge alone never creates success mail.
The selected target controls tracking; it does not restrict environments triggered
by the customer's pipeline. Reachability does not prove the executing commit.

## Verification evidence

Recorded in [server-only setup](verification/SERVER_ONLY_SETUP_2026_10_07.md):
97 application suites and 24 Node tests passed through the offline wrapper;
typecheck and isolated production build passed. Seven final UI/fleet browser
cases passed; eight phone onboarding cases passed in the preceding run. These
are local fixtures, not live Google/Meta or physical-phone acceptance.

[Migration rollout](verification/MIGRATIONS_2026_10_07.md): both outstanding
migrations applied, post-apply dry run empty, database boundary checks passed
with zero failures. This documentation refresh did not rerun application suites.

## Providers and rollout

Use existing Supabase Cloud, GitHub/Vault repository credentials, one supported
existing LLM provider, Linux web/worker hosting, registry images, and DNS/TLS.
Use your configured Gmail SMTP for application notifications; configure Supabase Auth's transactional
mail separately. Google OAuth serves Gmail inbox/reviewed replies; Pub/Sub is optional push delivery.
Meta WhatsApp Cloud API is needed for WhatsApp OTP, assistant replies and templates. Choose only the
cloud recovery adapter needed for the target: AWS, DigitalOcean, Hetzner or GCP.

Previously supplied LLM credentials can be reused; their deployment location must
be connected to the running processes. Missing local environment flags do not
prove credentials are absent from a remote secret store.

Follow the [provider and deployment plan](infrastructure/PRODUCTION_PROVIDER_PLAN.md)
and [new capability setup](infrastructure/CAPABILITY_PROVIDERS.md) for variable names and rollout order, and
[email/release setup](infrastructure/EMAIL_AND_RELEASES.md) for sender settings.

1. Select public application/preview domains and authorized test repo/server/users.
2. Confirm migration checkpoint, Auth redirects and transactional sender.
3. Publish immutable images; configure image allowlist, worker host and TLS routing.
4. Deploy web, coding, operations, experience and WhatsApp workers with their scoped configuration.
5. Configure GitHub signatures/CI status reporting, Meta and optional Gmail intake.
6. Publish/enroll the signed agent, pin command keys and wire a real security source.
7. Verify preview → approved PR/merge → deployment event → mailbox, WhatsApp
   delivered receipt, and independently approved service/cloud recovery.
8. Verify browser behavior, additional worker routing and reviewed-data quality.

## Detailed references

### Main changed implementation files

| Change | Source / verification |
| --- | --- |
| Approved cloud recovery | [Cloud recovery store](../backend/src/services/cloud-recovery-store.ts), [recovery verification](../scripts/verify-recovery-outbound-live.ts) |
| WhatsApp durable delivery | [Outbox](../backend/src/services/whatsapp-outbox.ts), [provider transport](../services/src/communication/whatsapp.ts) |
| Confirmed-account notifications | [Email preferences/outbox](../backend/src/services/email-notifications.ts), [SMTP notification transport](../services/src/communication/email-notifications.ts) |
| Signed security observations | [Security ingestion](../backend/src/services/security-ingestion.ts), [agent guide](../agent/README.md) |
| Approved website release | [Release store](../backend/src/services/release-store.ts), [release/email verification](../scripts/verify-release-email-live.ts) |
| Background dispatch | [Operations worker](../scripts/operations-worker.ts), [service unit](../infrastructure/ryvix-operations.service) |
| Earlier release schema | [Release/email migration](../supabase/migrations/20261002000003_release_email_notifications.sql), [cloud/outbox migration](../supabase/migrations/20261002000002_cloud_recovery_alert_outbox.sql) |

### Guides and decision records

- [Cloud/WhatsApp verification](verification/RECOVERY_OUTBOUND_2026_10_02.md)
- [Native operations](infrastructure/APPROVED_SERVICE_OPERATIONS.md)
- [Worker deployment](infrastructure/WORKER_DEPLOYMENT.md)
- [Channel inbox and reviewed learning](infrastructure/CHANNELS_AND_LEARNING.md)
- [Learning evaluation data](ai/EVALUATION_DATA.md)
- [Release/email decision](decisions/027-release-and-email-notifications.md)
- [Cloud/outbox decision](decisions/026-cloud-recovery-and-alert-outbox.md)

Architecture specifications describe intended scope where explicitly marked.
They must not override this measured implementation status or the approval rules.

Audit follow-up: [production isolation and Gmail scheduling](verification/AUDIT_FOLLOWUP_2026_10_03.md). Legacy JSON weights/memory are disabled in production; bounded coding context now follows local imports.
