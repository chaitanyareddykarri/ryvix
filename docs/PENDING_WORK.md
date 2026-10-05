# Pending work after the October 5 implementation follow-up

New implementation: approval-page server controls, parsed JS/TS references and local
aliases, per-attempt streaming usage, signed Twilio status callbacks and read-only
PagerDuty observations. See [follow-up evidence](verification/FOLLOWUP_2026_10_05.md).

This is the active remediation queue. The [audit](verification/WORKSPACE_AUDIT_2026_10_03.md)
preserves the original findings; [project status](PROJECT_STATUS.md) describes implemented workflows.

Latest [nine-item recheck](verification/PENDING_RECHECK_2026_10_04.md): servers mobile
overflow fixed and viewport settings made explicit. Missing viewport, absent classifier
promotion gates and hardcoded 45ms latency were stale findings. Deployment/provider
acceptance and representative reviewed quality evidence remain pending.

| Order | Work | Status |
| --- | --- | --- |
| 1 | Prevent the experimental simulator from approving compound/destructive commands; correct its safety claims | Fixed; regression checks passed |
| 2 | Remove false-success HTTP handling from the legacy integration test; explicitly separate fixtures and optional live checks | Fixed; regression checks passed |
| 3 | Return unavailable metrics for empty DPO evaluation | Fixed; regression checks passed |
| 4 | Resolve development dependency advisory compatibly and rerun checks | Unresolved upstream/toolchain dependency; no compatible fixed version established |
| 5 | Separate legacy synthetic weights from reviewed checkpoint deployment | Implemented production guard; reviewed database path preserved |
| 6 | Audit consumers before removing/quarantining global JSON memory, seeded topology and experimental brain exports | Production consumer review and memory/OODA/seed guards implemented; compatibility exports retained |
| 7 | Improve coding context/repair coverage and add authenticated acceptance scenarios | Bounded import-aware context and one verification repair implemented; authenticated live acceptance needs test login |
| 8 | Gmail intake and reviewed replies | Polling, authenticated push/watches and explicitly approved replies implemented; real Google delivery and deployed browser verification pending |
| 9 | Configure real workers, images, DNS/TLS, existing LLM credentials, SMTP, Meta and agent release | Needs deployment configuration |
| 10 | Verify real delivery, browser flows, coding-to-release, approved recovery and multi-host operation | Needs deployed test targets/accounts |
| 11 | Collect independently reviewed evidence, evaluate held-out quality and monitor drift | Needs representative data/reviewers |

No human-brain capability, universal self-learning or live-provider certification is claimed.
Existing dirty AI runtime files must remain outside source commits.

## Capability follow-up

| Capability | Completed code | Remaining work |
| --- | --- | --- |
| Gmail | Authenticated push, deduplication, worker renewal, reviewed reply UI and single-use approval | Google OAuth/send grant, Pub/Sub identity/topic/subscription, real mailbox and browser verification |
| Semantic/graph retrieval | Bounded opt-in embeddings and static dependency neighbors with permission/commit rechecks | Embedding provider/model configuration, representative retrieval evaluation; whole-repository compiler graph remains outside implemented scope |
| Languages | JS/TS syntax parsing, literal imports and bounded local config aliases; common reference forms in other listed languages | Other language parsers, inherited configs, runtime dynamic resolution and whole-repository compiler graphs |
| Tokens/cost | Durable web/WhatsApp/Gmail streaming attempts including failure/fallback/cancellation; reported counts and configured-rate estimates | Non-stream/embedding attempt coverage, live provider verification, account-wide billing/invoice reconciliation; missing counts remain unknown |
| External LLM training | Separate consented examples, independent review, partition checks and JSONL export API/UI | Provider/model choice, real reviewed dataset, provider job adapter/approval, evaluation and promotion/rollback |
| Slack/PagerDuty/SMS | Durable adapters; signed Twilio status receipts; optional exact-match PagerDuty incident observations | Accounts, consent, public callbacks and real delivery; Slack acceptance is not a read receipt; grouped PagerDuty incidents may not match |

Migration checkpoint: `20261005000003`. [Latest evidence](verification/FOLLOWUP_2026_10_05.md)
and [configuration](infrastructure/CAPABILITY_PROVIDERS.md). No real messages or paid jobs were submitted.

Items 1–3: [changes and verification](verification/AUDIT_REMEDIATION_2026_10_03.md).
For item 4, registry inspection still lists braces 3.0.3 as latest, within the
reported advisory range. A normal version bump is not an established fix; assess
replacement/removal or an upstream patch without blindly downgrading Next tooling.

Latest code follow-up: [isolation, coding context and Gmail scheduling](verification/AUDIT_FOLLOWUP_2026_10_03.md).
