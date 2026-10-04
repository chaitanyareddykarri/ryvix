# Channels and reviewed learning rollout

October 4 update: [current capability setup and limits](CAPABILITY_PROVIDERS.md). Gmail push/reviewed replies, additional P1 transports, measured response usage, bounded semantic retrieval and separate external-training dataset preparation now have implementations. Prior descriptions of these features as wholly absent are superseded; provider verification and actual external training remain pending.


October 3: [personal memory and reviewed experience](EXPERIENCE_AND_MEMORY.md)
adds durable outcome collection, explicit chat corrections, independent lesson
review and context reuse. The existing classifier training/review requirements
below still apply; collected events are not automatically trusted training labels.

## Implementation checkpoint — 2026-10-03

Code checkpoint: `d81b281`; applied migrations through `20261003000004`.
Implemented: reviewed experience/personal memory, bounded repository indexing,
Gmail SMTP email, WhatsApp OTP identity, opt-in AI replies/history/quotas, confirmed
coding requests, task notifications and authenticated approval handoffs. Releases
and server operations retain their existing web authorization and approval checks.
Recorded verification: 79 project suites plus 15 Node checks, typecheck/lint/build
and 125 database boundary checks passed. Provider delivery, deployed workers/browser
acceptance and representative model accuracy remain unverified.

See [project status](../PROJECT_STATUS.md), [assistant setup](WHATSAPP_ASSISTANT.md) and
[recorded verification](../verification/WHATSAPP_ASSISTANT_2026_10_03.md). This documentation update did not rerun those
code checks. Detailed designs below may include planned capabilities; the status
index distinguishes implemented behavior from future work.


## Gmail and WhatsApp

`/channels` connects accounts to an authorized environment and displays untrusted
task proposals. Acceptance creates an audited repository job; it does not approve
a PR, deployment or server action. Inbound message IDs are deduplicated and
receipt audits commit with the proposal. Current tenant membership and connector
status are rechecked. Reconnection replaces a Vault credential transactionally
within the same environment and preserves the inbox.

Gmail requires `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and an HTTPS
`RYVIX_PUBLIC_URL`. Register `<public origin>/api/channels/gmail` as the OAuth
redirect, authorize the Gmail read-only scope and offline access. Mail retrieval
is explicit bounded polling through "Check new messages", not Pub/Sub push.
Reconnect after an expired history cursor; this starts at the current mailbox
history and does not import the old backlog. OAuth sender identity is not project
authorization: a web operator must still review every proposal.

WhatsApp requires `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, and an explicitly
selected supported `WHATSAPP_GRAPH_VERSION`. Connect the provider phone ID and
access token through the administrator flow. Configure the Meta webhook at
`<public origin>/api/webhooks/whatsapp` and subscribe it to messages. GET challenges
and POST body signatures are checked separately. Incoming text does not authorize
an operation. No outbound message is sent by these verification scripts.

Current evidence: real SQL fixtures passed reconnect/Vault replacement, duplicate
delivery, reviewed task creation, tenant/revocation denial and audit persistence;
all fixtures were rolled back. Provider requests in unit tests are explicit
fixtures. Live Gmail/WhatsApp applications and accounts remain unconfigured.

## Reviewed classifier

`/learning` submits project-owned labeled observations with provenance and fixed
training/validation/test partitions. A different owner/admin reviews each sample.
Actual feature hashes prevent duplicate features crossing partitions. Global
legacy JSON patterns are not imported into tenant datasets.

Run `npm run train:reviewed -- <project UUID>` on the trusted worker, or install
the supplied `ryvix-learning@.service` and timer for an authorized project. Only
approved examples are used; at least 20 train, 10 validation and 10 test examples
are required, with each represented label present in every partition. Dataset
hashes deduplicate successful evaluations. Training failures exit nonzero for
service monitoring; no new checkpoint activates automatically.

Checkpoints store weights and measured accuracy, precision, recall, F1, support
and confusion matrices. The UI provides explicit promotion and rollback. These
scores describe supplied reviewed data; human-reviewed provenance and independent
representative held-out data are still required. Reusing a holdout can bias model
selection. There is no production-quality score in this continuation and no
external LLM fine-tuning claim. Missing datasets are not replaced with synthetic
production evidence.

`npm run verify:channels-learning` uses isolated rolled-back database fixtures.
It does not contact channel providers, send messages, train on real tenant data,
or certify model accuracy.

## October 3 worker additions

Run the web/API plus separate coding, operations, experience and WhatsApp processes.
Use npm run worker:experience for opted-in collection/repository indexing and
npm run worker:whatsapp for assistant processing; the assistant requires
RYVIX_WHATSAPP_ASSISTANT_ENABLED=true. These do not replace the coding or
operations workers. Apply migrations through 20261003000004 first.
See [assistant setup](WHATSAPP_ASSISTANT.md) and [experience setup](EXPERIENCE_AND_MEMORY.md).

## Scheduled Gmail continuation

Optional npm run worker:gmail polls explicitly allowlisted connected accounts.
It preserves reviewed task intake and requires current owner/admin authorization.
See [Gmail worker setup](GMAIL_POLLING.md). Real Google acceptance is still required.
