# Personal memory and reviewed experience

Implemented 2026-10-03, migration `20261003000001_experience_memory.sql`.
This extends the existing reviewed classifier pipeline. It does not fine-tune an
external LLM automatically or give a learned pattern permission to operate a server.

## User flow

Open `/experience` from Chat or Reviewed learning.

1. Add an explicit preference, goal, constraint or correction. Personal memories
   belong to the current user and organization; edit or forget them at any time.
   The UI uses a 30-day expiry; the API permits 1–90 days and at most 30 records.
   Chat receives up to 12 current memories as untrusted user context. Current
   instructions take priority. Forgetting does not rewrite past chat messages.
2. An owner/admin enables project collection and chooses 7–90 days of retention.
   Collection is off by default. Disabling deletes collected experience and its
   dependent lessons/predictions, not the original operational records.
3. The collection worker imports bounded outcome evidence. A user may explicitly
   share one of their saved chat turns and a correction with project reviewers.
   Another user's conversation cannot be selected or submitted through this API.
4. An authorized developer proposes a reusable lesson tied to one evidence record.
   A different current owner/admin independently reviews it; the original chat
   correction submitter cannot act as its independent reviewer either.
5. Approved, unexpired lessons can appear in chat and coding context. Retrieval
   rechecks project access and current author/reviewer membership. Revocation,
   expiry, disabled collection or source deletion prevents further retrieval.

Project evidence is shared with authorized developers/admins/owners. Personal
memory remains private to its author. Edits are audited; user mutations have a
durable 120-per-hour budget. All five new tables have RLS enabled and no direct
browser table privileges. Backend transactions lock membership before mutations.

## What is collected

| Source | Stored evidence | What it does not prove |
| --- | --- | --- |
| Coding tasks | Terminal task status, repository/base SHA, changed-file/check counts | A passing build does not prove user requirements or production correctness |
| Deployment events | Signed provider event ID, repository, commit, status | Application health or the executing commit |
| Security events | Event/server IDs, bounded type, severity and status | A detector classification is not an independently verified attack label |
| Metrics | Authenticated hourly CPU/RAM/disk summaries and bucket count | Metrics alone cannot identify all attacks |
| Service commands | Measured result status and command/server IDs | Application health |
| Cloud recovery | Recovery/server IDs, observed-health/unknown/expired status | Proof that a reboot happened |
| Chat corrections | Explicitly shared bounded question, answer and correction | Ground truth or permission to execute |

The worker copies no raw logs, prompts from coding tasks, arbitrary evidence JSON,
credentials or whole repositories. Each source has a stable event/version key;
retries deduplicate. Each project pass imports up to 200 records per source,
oldest eligible first. Hourly metric summaries are only taken after the hour ends.
Sources must be within the opt-in and retention windows. Polling captures available
snapshots, not a guaranteed journal of every intermediate state transition.

Lessons use bounded lexical retrieval, followed by the existing optional semantic
reranker in chat. A selected repository restricts lessons to its project; without
one, chat can retrieve authorized organization project lessons with project IDs.
Coding retrieves only its job's authorized project lessons. Current repository
file retrieval remains bounded and commit-pinned; there is no complete persistent
repository vector index or unrestricted graph RAG.

## Worker deployment

Deploy matching web/backend/worker code after applying the numbered migration.
Install `infrastructure/ryvix-experience.service` with its own
`/etc/ryvix/experience.env` containing verified-TLS `DATABASE_URL`,
`DATABASE_CA_CERT` and `RYVIX_EXPERIENCE_COLLECTION_ENABLED=true`.
Use the existing trusted database architecture and least-privilege service host.
The worker needs neither Docker nor customer cloud credentials.

```sh
npm run worker:experience -- --once
# Or run continuously through the supplied service:
npm run worker:experience
```

The worker is separate from cloud/alert operations, so collection cannot delay
reboot dispatch. It polls every minute, paginates projects, locks project collection,
and continues other projects after a project-specific failure. Expired memories
and experience are cleaned up. Check service logs for failed iterations.

Opt-in alone does not run the worker. Apply the migration, deploy the code, start
the service, enable collection, and exercise actual workflows before claiming
continuous production collection.

## Evaluation, training and observation mode

Successful chat turns now record actual response duration and provider/model
metadata. `/experience` shows the user's recent measurements. Missing samples
remain unavailable. Interrupted responses are excluded; latency is not correctness.
The legacy readiness helper no longer reports perfect scores on empty data or
a fabricated 45 ms latency. Its in-memory exports remain offline helpers.

Legacy global anomaly memory no longer influences `analyzeServerEvent` and valid
provider JSON no longer writes an automatic 0.95-confidence learned pattern.
Existing runtime files are preserved, not certified or silently imported.

The existing `/learning` workflow still requires explicit labeled examples,
independent review, immutable train/validation/test partitions, feature deduplication,
held-out thresholds and explicit promotion/rollback. Collection does not invent
labels. To train, investigate the source evidence and submit genuine supported
features/labels with provenance through that workflow. There is no automatic
experience-to-training export or cross-tenant training.

When collection is enabled and a reviewed classifier is active, the worker can
classify collected metric summaries in observation mode. It verifies the checkpoint's
samples remain approved, stores checkpoint/event/class identifiers, and never
executes actions or turns its predictions into ground truth. Deleting source
experience cascades to those predictions. Counts are not accuracy: confirmed labels
and representative held-out data are still needed. Only numeric metric features
are used in this mode, so its outputs cannot establish broad attack coverage.

The UI compares current and previous seven-day terminal coding/deployment/service
outcomes, keeping unknowns separate. This is a workload-sensitive operational
signal, not causal model evaluation. Results are bounded to 10,000 recent events.
Automated causal drift detection and automatic model rollout are not implemented.

For answer evaluation:

```sh
npm run eval:ai -- --live --report tmp/candidate-evaluation.json
npm run eval:ai -- --live --baseline tmp/candidate-evaluation.json --report tmp/comparison.json
# A reviewed custom dataset can replace the authored regression cases:
npm run eval:ai -- --cases path/to/reviewed-cases.json --answers path/to/answers.json --report tmp/offline-evaluation.json
```

Reports include dataset/prompt hashes, provider/model identifiers, actual live
latency, per-case rubric results and baseline regressions. Reports are created
without overwriting existing files. Missing providers/invalid data fail rather than
fabricating a quality score. Regex checks require human correctness review; the
14 authored regression cases are not a representative production benchmark.
No command above submits fine-tuning jobs or activates a model.

External LLM fine-tuning, dedicated coding benchmarks, a broader repository index,
automatic label proposals and gradual model traffic rollout require further work.
Existing LLM keys can be reused for answering/evaluation once connected to runtime;
fine-tuning support depends on the chosen provider/model and reviewed dataset.

## Verification

Run `npm run verify:experience` for real SQL rollback fixtures covering authorization,
collection, review, retention and prediction recording. No external provider is
called by that verifier. Follow [the October 3 checkpoint](../verification/EXPERIENCE_2026_10_03.md)
for exact results and production limitations.
