# Pending work - October 7, 2026

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
| Development dependencies | October 8 audit: five high development-chain findings remain without a patched braces release; reassess a compatible patch/replacement. Next.js upgraded to 15.5.27; fresh production audit reports zero. See the dependency audit linked above. |
| Repository intelligence | Broader language parsers, dynamic resolution, whole-repository compiler graphs and representative retrieval evaluation; current bounded JS/TS references and supplied-config aliases are implemented. |
| Usage/cost | Live provider reconciliation and account-wide invoice reconciliation; durable attempt accounting exists and missing counts stay unknown. |
| Reviewed learning | Consented representative examples, independent labels, held-out evaluation, measured quality and drift monitoring; runtime memory is not model training. |
| External training | Provider/model selection, approved dataset/budget, provider job lifecycle adapter, evaluation, promotion and rollback; reviewed dataset export already exists. |

No real messages, paid training jobs, customer PR merges or recovery commands are
authorized by this documentation update. Preserve existing AI runtime data.
