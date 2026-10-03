# Ryvix implementation and deployment status

Updated 2026-10-03. Code checkpoint: **d81b281**; applied migrations through
**20261003000004**. This index supersedes older pending lists. Dated verification
reports retain their original results; no live certification is implied.

Recent changes: reviewed experience/personal memory (1c23389), bounded repository
indexing (5d3a3d5), Gmail SMTP and WhatsApp OTP (4d1369a), then the WhatsApp assistant
(d81b281). [Assistant evidence](verification/WHATSAPP_ASSISTANT_2026_10_03.md).

## Implemented changes

| Area | Implemented behavior | Remaining boundary |
| --- | --- | --- |
| Security | Settings membership lock, mutation and audit share a transaction; project GitHub credentials resolve through Vault; durable chat quotas | Exercise deployed authentication and provider flows |
| Chat | Conversation reload/archive, tenant-scoped incident/task retrieval, bounded commit-pinned repository files, optional Gemini reranking and recorded HOSTED_ON relationships | No full repository semantic index or arbitrary graph traversal; live streaming/answer review pending |
| Native operations | Independent persisted approval, signed expiring commands, nonce receipts, Linux replay journal, service allowlists, cooldowns and measured service-state receipts | Enroll a deployed agent and verify an approved restart; service state is not application health |
| Cloud recovery | Independent approval of a frozen allowlisted target, durable one-attempt reboot dispatch, cooldowns, provider outcomes and heartbeat observation | Configure scoped cloud account/test host and verify an actual approved reboot; observed liveness does not prove a reboot |
| WhatsApp | OTP identity, opt-in assistant, durable replies/history/quotas, authorized answers/status, confirmed coding requests, task notifications and P1 alerts | Real Meta OTP/reply/template delivery and browser acceptance; release/server approvals remain authenticated web handoffs |
| Gmail | Vault-backed read-only OAuth polling into reviewed task proposals | Real OAuth intake verification; Pub/Sub push and Gmail replies remain unimplemented |
| Experience and repository knowledge | Explicit personal memory, owned corrections, opt-in outcome snapshots, independently reviewed lessons and bounded commit-pinned text index | Representative reviewed data and live answer quality; full vector/graph retrieval and external LLM training are not established |
| Account email | `/notifications` opt-in per environment; durable SMTP sends to confirmed account email, including Gmail; security and approved-release results | Authorized SMTP sender/credentials, actual detector and inbox verification; provider acceptance is not delivery |
| Releases | `/releases` owner/admin approval of exact reviewed head and mapping version; protected default branch and successful checks; bounded merge and read-only reconciliation | Existing customer CI/CD performs deployment; real approved release/webhook/runtime/browser acceptance pending |
| Worker scale | Stable host ownership, host-scoped cleanup, advisory process lock and allowlisted preview host routing | Configure images/domains/TLS and verify multiple deployed hosts |
| Reviewed learning | Tenant examples, independent labels, immutable splits, held-out metrics, gated promotion and rollback | Representative reviewed data, measured real quality and drift monitoring; legacy memory/weights are not training evidence |
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

## Schema and verification evidence

The existing Supabase project has migrations applied through
`20261003000004_whatsapp_assistant.sql`. October 1 migrations cover
settings/chat budgets, reviewed learning, inbox, worker hosts and signed commands.
October 2 migrations add runtime observations, cloud recovery/WhatsApp outbox,
and release/email records. October 3 adds experience, repository knowledge, phone identity and assistant records. Rollout used verified TLS, without resets or seeds.

Latest code-batch results, recorded in the
[assistant checkpoint](verification/WHATSAPP_ASSISTANT_2026_10_03.md):

- `npm test`: 79 project suites, zero failed, plus 15 Node checks.
- Typecheck, lint and production build passed; 125 read-only database checks passed.
- Release/email and recovery fixtures exercised real SQL transactions with
  injected external providers and rolled back their data. No real reboot,
  notification send or customer PR merge occurred in these checks.
- Windows Application Control blocked the Go dispatcher test executable; other
  packages passed. All four dispatcher tests passed in isolated Linux; Go vet passed.
- Existing dirty `ai/data` was preserved and excluded from source commits.

These are prior code verification results, not tests rerun by this documentation
update. Authenticated deployed browser flows and real provider delivery remain
unverified. Earlier dated suite counts describe earlier checkpoints.

## Providers and rollout

Use existing Supabase Cloud, GitHub/Vault repository credentials, one supported
existing LLM provider, Linux web/worker hosting, registry images, and DNS/TLS.
Use your configured Gmail SMTP for application notifications; configure Supabase Auth's transactional
mail separately. Google OAuth is needed only for reading the Gmail task inbox.
Meta WhatsApp Cloud API is needed for WhatsApp OTP, assistant replies and templates. Choose only the
cloud recovery adapter needed for the target: AWS, DigitalOcean, Hetzner or GCP.

Previously supplied LLM credentials can be reused; their deployment location must
be connected to the running processes. Missing local environment flags do not
prove credentials are absent from a remote secret store.

Follow the [provider and deployment plan](infrastructure/PRODUCTION_PROVIDER_PLAN.md)
for variable names and rollout order, and
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
