# Main publication checklist — October 2, 2026

## Historical checkpoint — 2026-10-02

This report is retained as evidence of its original inspection or test run.
The latest implementation checkpoint is `45b130b`: cloud recovery, WhatsApp P1
dispatch, security email and approved releases are implemented in that checkpoint.
The latest recorded schema is `20261002000003`; provider acceptance is still pending.

See the [current project status](../PROJECT_STATUS.md) for the
implemented scope, migration checkpoint, verification evidence and remaining work.
Results and pending lists below describe the original checkpoint; later changes
are recorded in the status index. Historical counts are intentionally preserved.


The user requested committing the accumulated implementation and pushing main.
The fetched main revision is an ancestor of the working branch; no force push is
needed. Secrets and pre-existing generated `ai/data` changes are excluded.

## Corrections to the supplied checklist

| Claim | Checked implementation and limitation |
| --- | --- |
| Settings authorization still uses separate queries | Fixed: membership is locked with `SELECT FOR UPDATE` inside the same transaction as the mutation and audit. |
| Chat only searches saved snapshots | Reload/archive UI, commit-pinned bounded repository files, optional semantic reranking and authorized recorded topology are implemented. Live embeddings/provider/browser verification remains pending; this is not a full repository vector index or arbitrary graph traversal. |
| No weight accuracy gate | The reviewed tenant checkpoint pipeline requires validation/test accuracy and macro recall of at least 0.8, and accuracy non-regression against the baseline. Legacy global checkpoint loading only validates format. Representative reviewed unseen data and real quality measurements remain pending. |

## Consolidated status and next work

| Area | Implemented | Still required |
| --- | --- | --- |
| Security | Transactional settings/audits, scoped Vault GitHub credentials, durable UTC request quotas | Provider-issued JWT and authenticated browser verification |
| Deployment | Worker prerequisite enforcement and deployment configuration documentation | Production images/allowlist, provider credentials, host ID/domain map, preview DNS/TLS/signing, public URL, release manifest/assets and deployed-worker verification |
| Native operations | Persisted independent approvals, signed expiring commands, replay journal, delivery receipts and measured service outcomes | Authorized Linux rollout, pinned keys, service allowlists and real execution verification |
| Cloud recovery | Unsafe browser reset remains disabled | Separate durable cloud approval/dispatch/outcome workflow |
| Live integration | Local Docker verification and persisted deployment/runtime observations | Actual clone → provider changes → checks → public preview → approved PR; public webhook and real endpoint correlation. Reachability does not establish the executing commit. |
| Connectors | Gmail OAuth polling and WhatsApp signed reviewed inbox, deduplication and audit | Real accounts/app credentials and delivery; Gmail push subscription and outbound/mobile approval workflows remain separate |
| Scale | Worker host ownership, host-scoped cleanup and preview routing | Live multi-host deployment and reconciliation of historical unowned sessions |
| Chat | History reload/archive and bounded authorized retrieval | Live model streaming, embeddings, browser and answer-quality evaluation |
| Learning | Independent review, partition deduplication, protected checkpoints, evaluation gates, promotion/rollback and training script | Representative data, independent holdout measurements, operational scheduling and drift monitoring |

## Publication verification

Fresh `npm test` passed 73 project suites with zero failures, plus 15 Node checks.
Fresh typecheck and lint passed. Secret regression scan and whitespace checks
passed. Runtime files were backed up before tests and restored afterward.

The live readiness probe passed verified-TLS database access and found no missing
migrations in the ledger. It still reports missing cloud coding credentials,
`PREVIEW_BASE_DOMAIN`, `PREVIEW_SIGNING_SECRET`, `RYVIX_PUBLIC_URL`,
`RYVIX_AGENT_RELEASE_MANIFEST`, `RYVIX_WORKSPACE_NODE_IMAGE`,
`RYVIX_WORKSPACE_EGRESS_IMAGE`, `RYVIX_WORKSPACE_IMAGES`,
`RYVIX_WORKER_HOST_ID` and `RYVIX_WORKER_PREVIEW_DOMAINS`.
These are configuration blockers, not completed production verification.

The preceding continuation records successful production build, Go tests/vet,
Linux command tests, real local Docker checks and rolled-back SQL integration
fixtures. Those fixtures do not prove live provider delivery or model quality.
