# Provider setup for the October 4 capability batch

Application OTP, security alerts and deployment mail continue to use your Gmail
SMTP configuration. Resend is not required. Existing external LLM credentials can
be reused when mounted into the web and appropriate worker processes.

## Gmail push and reviewed replies

1. Keep the existing Google OAuth application, Gmail API, HTTPS callback and Vault
   refresh-token connection. Reconnect with **reply permission** on `/channels` only
   if you want `gmail.send`; the ordinary connection remains read-only.
2. In the same Google project, create a Pub/Sub topic and grant Gmail's publishing
   service identity permission to publish. Create an authenticated push subscription
   targeting `/api/webhooks/gmail`, using a dedicated service account and exact audience.
3. Set `GMAIL_PUBSUB_TOPIC`, `GMAIL_PUBSUB_SUBSCRIPTION`,
   `GMAIL_PUBSUB_AUDIENCE` and `GMAIL_PUBSUB_SERVICE_ACCOUNT` on web/worker as applicable.
   Topic/subscription values are full `projects/.../topics/...` and
   `projects/.../subscriptions/...` resource names. Audience is the exact configured URL.
4. Enable push for the connection in `/channels`. Keep that connection in
   `RYVIX_GMAIL_POLL_CONNECTORS` and run the Gmail worker. Notifications wake polling
   on its five-second cycle; periodic recovery polling runs every minute. The worker
   renews enabled watches within one day of expiry. Failures back off for one minute.
5. Use `/channels/gmail` to select incoming mail, enter a reply or request an AI draft,
   review the exact recipient/body, then approve. Drafts expire after 30 minutes.
   Only the current connected mailbox owner with owner/admin membership can send.

Test with a real authorized mailbox: receive once, repeat notification, check cursor,
review/send, verify the recipient inbox, then revoke the capability and confirm denial.
Google acceptance does not prove recipient delivery. Unknown sends require investigation;
they are never automatically retried. This is reviewed correspondence, not an autonomous
email agent with project access. Incoming senders do not gain a Ryvix identity.

See [Google watch](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/watch)
and [authenticated push](https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions).

## Semantic repository retrieval and dependencies

Enable the existing experience worker and repository indexing, with owner/admin
opt-in for each repository at `/knowledge`. To add embeddings, set
`RYVIX_REPOSITORY_SEMANTIC_ENABLED=true`, `GEMINI_API_KEY`, and an explicitly chosen
`GEMINI_EMBEDDING_MODEL` in both indexing and query processes. Sanitized source excerpts
are sent to that configured embedding provider. Disabling repository indexing deletes
its stored content and vectors; disabling the semantic flag keeps lexical retrieval.

Indexing remains at most 100 files / 1 MiB per repository. Search scans at most 100
authorized fresh snapshot rows, returns at most six excerpts, and rechecks access and
commit identity after the provider call. Embedding failure falls back to lexical search.
This is bounded semantic matching plus local static dependency neighbors, not an
unbounded vector database or compiler-resolved whole-repository graph.

Static reference extraction covers common JS/TS, Python, Rust, Go, C/C++, Ruby,
Java, C# and PHP forms. Aliases, generated code, dynamic loading and some namespace
references remain unresolved. Coding context stays within 24 files / 160 KB and
considers at most 2,000 candidate paths for dependency expansion.

## Usage and cost

Completed web/WhatsApp streams persist provider-reported input/output/cache counts
when present. Missing or interrupted usage remains unknown. Completion paths also
no longer invent counts. Optional `RYVIX_MODEL_RATES_JSON` maps exact `provider:model`
keys to versioned currency and per-million rates; cache rates must be supplied when
cache usage is reported. Monetary results are **configured-rate estimates**.
Provider invoices, failed/fallback attempt costs and account-wide billing are not
reconciled by this implementation. No fixed pricing or free-tier promise is made.

## Optional P1 transports

| Provider | Real configuration |
| --- | --- |
| Slack | Installed app with `chat:write`, bot token in Vault, authorized channel ID |
| PagerDuty | Events v2 service integration routing key in Vault |
| Twilio SMS | Messaging account, authorized sender and opted-in destination; Vault JSON containing `accountSid`, `authToken`, `from` |

Set `RYVIX_INCIDENT_NOTIFICATIONS_ENABLED=true` on the operations worker only after
provisioning. `RYVIX_INCIDENT_NOTIFICATION_TARGETS` contains stable target UUID,
environment UUID, current owner/admin user UUID, provider (`slack`, `pagerduty`,
`twilio`), destination, Vault secret UUID and `optedIn:true`. PagerDuty destination
is the literal `integration`; its Vault key selects the service. Never put raw
credentials in this list. This is trusted deployment configuration, not user input.

The queue deduplicates incident/target pairs, rechecks the target fingerprint,
membership and active P1 incident, and limits each target to three claims/minute.
Changed/removed targets cancel queued notifications. Provider acceptance appears in
`/channels/alerts`; delivery/read receipts for these three transports are not implemented.
SMTP and WhatsApp retain their separate existing workers/receipt behavior.

## External LLM training preparation

Use `/learning/external` for submission, review, revocation and bundle download.
`/api/learning/external` is the authenticated owner/admin API. GET takes `projectId`.
POST uses `projectId` and an action:

- `submit`: `question`, corrected `answer`, `provenance`, `evidenceGroup`,
  `partition` (`train`, `validation`, `test`), `externalTrainingConsent:true`.
- `review`: `id`, `approve`, `note`; an independent current owner/admin reviews.
- `revoke`: `id`; excludes that example from future exports.
- `export`: `provider`, `model`; returns separate JSONL strings and hashed manifest.

Minimum export gate: 20 approved train, 5 validation and 5 test examples, with
question deduplication and evidence-group partition isolation. Current author/reviewer
membership and explicit consent are rechecked. Never upload the held-out test file as
training data. Exports may contain sensitive project knowledge: keep them private and
respect consent/retention, including deleting previously downloaded revoked examples.

This API prepares data; it does not validate provider model eligibility or submit
paid jobs. Next requirements: choose the fine-tuning provider/model, adapt its upload
format, approve an exact dataset hash and budget, submit/monitor the job, run held-out
and regression evaluation, then explicitly promote with a rollback target. There is
no dataset or improved-quality claim merely because these controls exist.
