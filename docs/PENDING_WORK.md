# Pending work - October 10, 2026

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

October 9 non-deployment implementation: [current evidence and remaining work](verification/NONDEPLOYMENT_2026_10_09.md).
Bounded signed journal logs, inventory persistence, context compaction, pre-plan
quota retries, snapshot compiler resolution and saved usage comparison are added.
Two new migrations are rollback-tested but not applied. Reviewed datasets have
zero approved examples; broader analysis/scanning, external training
and concurrency acceptance remain open. The lint dependency chain is replaced;
see current evidence for final audit results. Older statements below about
missing quota/context functionality or zero pending migrations are superseded.

## Current follow-up

Hosting selection for the restricted trial is Vercel plus two AMD64 Oracle Micro
VMs. The older single-ARM-host sections below are historical, not this trial's
deployment instructions. All five Step 2 code items have local evidence in the
[recheck matrix](verification/MICRO_STEP2_2026_10_10.md). The recheck fixed split
Compose tmpfs options and added rendered-configuration checks to CI.

Pending rollout: publish the reviewed revision, pass GitHub CI and record image
digests; configure Vercel and protected host credentials; apply the two pending
migrations; establish preview DNS/TLS; then verify real provider flows, streaming,
whole-host resource usage and rollback. None is marked complete by local tests.
Broader non-deployment work remains listed in the
[October 9 evidence](verification/NONDEPLOYMENT_2026_10_09.md#remaining-work-separate-from-hosting):
analysis/scanner coverage, reviewed evaluation data, external training adapters,
usage reconciliation and isolated concurrency acceptance. It is outside Step 2.

AI fallback is implemented and small live
Gemini/Groq completion and streaming probes passed locally. Complete the
[post-deployment checklist](infrastructure/POST_DEPLOYMENT_CHECKLIST.md) before
claiming deployed chat or coding works. Local secrets are not published by Git.

October 8 Oracle phase 1: deployment code is implemented locally; see
[evidence](verification/ORACLE_PHASE1_2026_10_08.md). Next gates are publication
and native ARM CI, Oracle/DNS installation, live model selection/acceptance and
the restricted pilot checks. Use the [release runbook](infrastructure/ORACLE_RELEASE_RUNBOOK.md).

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

This is the current queue. [Project status](PROJECT_STATUS.md) records completed
work. Earlier dated audits retain their original findings and are superseded
where the current implementation closes them.

## Completed; no longer pending

Requested phone/WhatsApp onboarding, operational UI/navigation, dashboard fixes,
team management, repository inspection, API-key controls, server tools, matching
styles and server-only environment creation are implemented locally. Google
login code is implemented alongside manual login. Both outstanding database
migrations are applied through `20261007000001`, with zero pending numbered
files and passing database boundary checks. See [rollout](verification/MIGRATIONS_2026_10_07.md).

## Ordered acceptance and deployment queue

1. Exercise hosted transactional/concurrency behavior for team invitations,
   repository URL updates and server-only environment creation. Schema/grant
   checks pass; those do not establish complete workflow acceptance.
2. Verify deployed authenticated profile, team, API-key, chat restoration and
   cross-device website URL flows; test physical mobile browsers.
3. Configure an authorized Linux host, immutable worker images, application and
   preview DNS/TLS, signing secrets, worker ownership and a versioned agent release.
4. After deployment, activate Google login using the
   [setup guide](integrations/GOOGLE_LOGIN.md); verify new/returning identities,
   provisioning, account switching and manual email/password recovery. Activation
   remains deferred to the real-provider phase by user instruction.
5. Configure existing scoped GitHub/model/SMTP/Meta credentials and authorized
   test accounts; enable optional Gmail Pub/Sub, Slack, PagerDuty, Twilio or cloud
   recovery only for selected integrations. Follow the
   [provider plan](infrastructure/PRODUCTION_PROVIDER_PLAN.md).
6. Verify real OTP/messages/receipts, coding preview to approved PR/release and
   customer CI deployment observations; enroll an agent and verify independently
   approved service/cloud recovery and multiple worker hosts.

## Remaining implementation and evidence

| Area | Remaining work |
| --- | --- |
| Development dependencies | October 9: scoped lint adapter removes the vulnerable chain; full npm audit reports zero and clean installation passed. Recheck the adapter contract when upgrading Next. |
| Repository intelligence | Broader language parsers, dynamic resolution, whole-repository compiler graphs and representative retrieval evaluation; current bounded JS/TS references and supplied-config aliases are implemented. |
| Usage/cost | Live provider reconciliation and account-wide invoice reconciliation; durable attempt accounting exists and missing counts stay unknown. |
| Reviewed learning | Consented representative examples, independent labels, held-out evaluation, measured quality and drift monitoring; runtime memory is not model training. |
| External training | Provider/model selection, approved dataset/budget, provider job lifecycle adapter, evaluation, promotion and rollback; reviewed dataset export already exists. |

No real messages, paid training jobs, customer PR merges or recovery commands are
authorized by this documentation update. Preserve existing AI runtime data.
# AI provider activation follow-up

Ordered provider fallback is implemented; see [setup](integrations/AI_PROVIDER_FALLBACK.md).
Local keys/models are configured and individual live provider probes passed.
Pending: recommended key rotation, deployment secrets, deployed chat/coding
acceptance and full sandbox/PR workflow verification. Bounded extractive context
compaction and durable pre-plan quota retries are implemented and locally tested;
the quota migration still requires application before release. Oracle execution
is deferred while we prepare the deployment plan.
