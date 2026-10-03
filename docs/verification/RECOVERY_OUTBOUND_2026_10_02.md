# Cloud recovery and WhatsApp outbound checkpoint

## Historical report — current reference updated 2026-10-03

The original findings, counts and pending lists below remain historical evidence.
Current code is `d81b281`, schema `20261003000004`; see
[project status](../PROJECT_STATUS.md) and [latest verification](WHATSAPP_ASSISTANT_2026_10_03.md).
Do not interpret older missing-feature lists as current or fixture passes as real
provider/browser certification. No historical test result was changed or rerun
by this documentation update.


## Implemented

- `/recovery` and `/api/servers/recovery`: independent tenant administrator
  approval, exact displayed cloud target, role revalidation at dispatch, cooldowns,
  durable claim before external mutation and no automatic retry of unknown results.
  A changed operator target invalidates the old request and requires new approval.
- Dedicated `worker:operations` and systemd service: supported cloud adapter
  dispatch and post-request liveness observation. Running state plus a fresh signed
  heartbeat is explicitly not proof of reboot or application health.
- Legacy `execute_capability` and `oob_cloud_reboot` now create persisted approval
  requests with HTTP 202. A browser `approved` boolean grants no execution rights.
- P1 WhatsApp alerts: tenant incident outbox, operator-managed recipient consent,
  connector Vault tokens, one approved template send, deduplication, rate limiting,
  durable early delivery receipts and monotonic delivered/read status. Delivery UI
  is `/channels/alerts`. Ambiguous sends stay unknown and are not retried.
- The six random ID suffixes in semantic memory, long-term memory, semantic cache
  and risk-alert dispatcher now use cryptographic UUIDs. Existing records remain.
- `.env.example` now names supported LLM keys and the actual GitHub OAuth variables;
  removed misleading unused placeholders and duplicate Gmail values.
- Full account/configuration and rollout sequence is documented in
  `../infrastructure/PRODUCTION_PROVIDER_PLAN.md`.

## Evidence

- `npm test`: 74 project suites, zero failures, plus 15 Node checks.
- Production build, workspace typecheck and lint passed. Secret scan found zero findings.
- `npm run verify:recovery-outbound`: actual SQL scope, independent approvals,
  revoked approver, changed target, one-attempt dispatch, cooldown, unknown outcome,
  heartbeat observation, inbox/outbox scope, deduplication, callback ordering,
  removed consent and ambiguous/crashed send cases. External adapters were injected;
  every fixture was rolled back. No real reboot or WhatsApp message was sent.
- Incremental migration `20261002000002_cloud_recovery_alert_outbox.sql` applied
  through the existing verified-TLS CLI after dry run. No reset or seed operation.
- `npm run verify:database`: 93 read-only checks passed, zero failures.
- Runtime AI data was backed up before tests and restored afterward. Existing dirty
  memory/weights remain outside source commits.

## Still requires deployment or additional product work

Provider accounts and production credentials, designated hosts/domain/certificates,
agent releases and actual browser/provider execution are not established by these
checks. Current local runtime has no supported LLM credential; reuse the user's
existing key at deployment rather than assuming another purchase is needed.

Full WhatsApp LLM conversation/replies and phone-to-user identity linking, mobile
approvals, Gmail outbound replies and push subscription are not implemented here.
Customer self-service cloud credential onboarding and automatic GCP token refresh
also remain separate. Current cloud recovery serves operator-configured targets.
Real reviewed datasets, measured model quality, production drift monitoring and a
real clone-to-approved-PR acceptance run remain open.
