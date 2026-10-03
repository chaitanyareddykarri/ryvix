# Ryvix

Latest: [experience and personal memory](docs/infrastructure/EXPERIENCE_AND_MEMORY.md)
adds explicit preferences, reviewed chat corrections, outcome collection and
lessons reused by chat/coding. Migration `20261003000001` is applied; see the
[October 3 verification](docs/verification/EXPERIENCE_2026_10_03.md). The older
checkpoint below predates this continuation.

Ryvix combines repository coding tasks, isolated previews, tenant-scoped chat,
server telemetry and approved operations in an npm monorepo.

Current implementation: **45b130b, 2026-10-02**. Supabase migrations are applied
through **20261002000003**. Live deployment, provider delivery and representative
model quality remain unverified. Read [project status](docs/PROJECT_STATUS.md)
for the complete implemented/pending list and recorded verification results.

## Main workflows

- Coding: task → sandbox changes/checks → preview/diff review → approved PR →
  explicit owner/admin release approval → protected-branch merge → customer CI/CD.
- Notifications: opted-in users receive security and approved-deployment results
  at their confirmed account email through Resend. Gmail recipients need no
  mailbox OAuth. A matching signed deployment event is required for result mail.
- Operations: independently approved service restart or allowlisted cloud reboot,
  with durable claims, replay/duplicate protection, cooldowns and recorded outcomes.
- Channels: Gmail read-only polling and signed WhatsApp messages become reviewed
  task proposals. WhatsApp P1 template alerts have durable delivery receipts.
  Full WhatsApp LLM chat, mobile approvals and Gmail replies remain future work.
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

Read [AGENTS.md](AGENTS.md) and its linked instructions before changes. Install
workspace dependencies with `npm ci`; configure ignored environment files using
[the provider plan](docs/infrastructure/PRODUCTION_PROVIDER_PLAN.md). Secrets must
never enter source control, prompts or customer sandboxes. Use the existing hosted
Supabase database; do not create a local database container or reset production.

```sh
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Back up existing `ai/data` before tests and restore runtime data afterward;
tests can modify tracked memory/weights. Do not include generated data in commits.
The `test:e2e` alias runs the project test runner; its name does not establish
real browser/provider end-to-end certification.

Configured worker entry points are `npm run worker:workspaces` and
`npm run worker:operations`. Production host, images, allowlists and secrets must
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
- [Latest code verification](docs/verification/EMAIL_RELEASE_2026_10_02.md)

The latest code checkpoint recorded 75 project suites plus 15 Node checks,
typecheck/lint/build and 99 read-only database checks passing. These are recorded
results, not a production-readiness claim. Historical reports retain their original
counts; use the current status index to resolve superseded pending lists.
