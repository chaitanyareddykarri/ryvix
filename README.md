# Ryvix

## Active hosting selection - Railway and AWS

The user selected [Vercel + Railway workers + AWS workspace](docs/infrastructure/RAILWAY_AWS_TRIAL.md).
Vercel is deployed at ryvix.vercel.app and login works by user report. Railway
worker configuration is prepared locally; deployment and provider acceptance
remain pending. AWS terminal access works by user report, but the 1 GB/8 GB host
needs storage and Docker preparation. Oracle recovery is deferred, not completed.
Earlier Oracle placement and Step 4 access notes below are historical snapshots.


Current deployment plan (October 10): [Vercel and two AMD64 Oracle Micro VMs](docs/infrastructure/MICRO_VERCEL_TRIAL.md).
Step 1 host preparation is evidenced by user-provided terminal output. Step 2
code adaptation is implemented and locally checked; it is not a live deployment.
Vercel hosts the dashboard/APIs, VM 1 selected workers, and VM 2 one restricted
static-page workspace. Supabase and model inference remain external.
See the [five-item verification matrix](docs/verification/MICRO_STEP2_2026_10_10.md)
and [ordered next steps](docs/infrastructure/MICRO_VERCEL_TRIAL.md#next-steps-in-order).

Active follow-up: [audit remediation queue](docs/PENDING_WORK.md). The October 3 audit found
legacy AI safety/evidence defects; earlier passing suites are not full live acceptance.

Ryvix combines repository coding tasks, isolated previews, tenant-scoped chat,
server telemetry and approved operations in an npm monorepo.

Updated **2026-10-10**. Migrations **20261009000001** and **20261009000002**
are prepared and rollback-tested but remain pending application at the latest
recorded checkpoint. This documentation update did not query the hosted ledger.
Source publication does not establish a deployed release; use the rollout gates below.
See [project status](docs/PROJECT_STATUS.md) for implementation, evidence and
remaining live acceptance. Provider delivery and model quality are not certified.

## Main workflows

- Coding: task → sandbox changes/checks → preview/diff review → approved PR →
  explicit owner/admin release approval → protected-branch merge → customer CI/CD.
- Notifications: opted-in users receive security and approved-deployment results
  at their confirmed account email through configured Gmail SMTP. Gmail recipients need no
  mailbox OAuth. A matching signed deployment event is required for result mail.
- Operations: independently approved service restart or allowlisted cloud reboot,
  with durable claims, replay/duplicate protection, cooldowns and recorded outcomes.
- Channels: Gmail read-only polling creates reviewed task proposals. WhatsApp has
  OTP phone linking, opt-in AI chat, private history, quotas, confirmed coding
  requests, task updates and P1 alerts. Release/server approval links open the
  authenticated web workflow. Authenticated Gmail push and reviewed replies are implemented; live acceptance remains pending.
- Chat and learning: persisted conversations, bounded authorized retrieval and
  provider streaming; separately reviewed tenant training examples and gated
  checkpoint promotion. Runtime memory is not evidence of trained model quality.

## Workspace

| Directory | Responsibility |
| --- | --- |
| `web/` | Next.js App Router UI and API |
| `backend/` | Authorization, tenant repositories, connectors and audit |
| `services/` | Coding workspaces, workers and provider dispatch |
| `ai/` | Reasoning, model adapters and learning components |
| `packages/database/` | Shared database clients and types |
| `agent/` | Go device enrollment, telemetry and approved command transport |
| `supabase/migrations/` | Incremental hosted database migrations |
| `tests/` | Automated verification |

## Development and verification

For one sequential local check command, run `npm run verify:all`; inspect its
scope with `npm run verify:all -- --list`. See the [scripts guide](docs/SCRIPTS_GUIDE.md)
and [worker operations plan](docs/infrastructure/WORKER_OPERATIONS.md).

Read [AGENTS.md](AGENTS.md) and its linked instructions before changes. Install
workspace dependencies with `npm ci`; configure ignored environment files using
[the provider plan](docs/infrastructure/PRODUCTION_PROVIDER_PLAN.md). Secrets must
never enter source control, prompts or customer sandboxes. Use the existing hosted
Supabase database; do not create a local database container or reset production.

```sh
npm run dev
npm run typecheck
npm run lint
npm run test:offline
npm run test:browser
npm run build
```

Back up existing `ai/data` before tests and restore runtime data afterward;
tests can modify tracked memory/weights. Do not include generated data in commits.
The offline wrapper runs `npm test`, blocks external network and restores AI
runtime data. `test:e2e` aliases Playwright browser fixtures; this does not
establish authenticated deployed or real-provider end-to-end certification.

Configured worker entry points are `npm run worker:workspaces`,
`npm run worker:operations`, `npm run worker:experience` and `npm run worker:whatsapp`. Production host, images, allowlists and secrets must
be configured before starting them. Reviewed learning uses `npm run train:reviewed`
with the [reviewed-data process](docs/ai/EVALUATION_DATA.md); legacy `train` commands
are not a substitute for representative held-out evaluation and promotion.

## Documentation

- [Current changes, verification and remaining work](docs/PROJECT_STATUS.md)
- [Provider accounts and deployment order](docs/infrastructure/PRODUCTION_PROVIDER_PLAN.md)
- [Security emails and approved releases](docs/infrastructure/EMAIL_AND_RELEASES.md)
- [Native service approvals](docs/infrastructure/APPROVED_SERVICE_OPERATIONS.md)
- [Worker deployment](docs/infrastructure/WORKER_DEPLOYMENT.md)
- [Gmail and WhatsApp inbox / reviewed learning](docs/infrastructure/CHANNELS_AND_LEARNING.md)
- [Agent setup](agent/README.md)
- [Latest code verification](docs/verification/WHATSAPP_ASSISTANT_2026_10_03.md)

The latest code checkpoint recorded 79 project suites plus 15 Node checks,
typecheck/lint/build and 125 read-only database checks passing. These are recorded
results, not a production-readiness claim. Historical reports retain their original
counts; use the current status index to resolve superseded pending lists.

Audit follow-up: production legacy-weight/memory isolation, unseeded topology,
import-aware bounded coding context and opt-in scheduled Gmail polling are implemented.
See [remaining work](docs/PENDING_WORK.md) for unresolved dependency and live acceptance requirements.
