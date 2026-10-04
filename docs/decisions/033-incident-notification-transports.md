# ADR 033: Explicitly configured P1 transports

Slack bot messages, PagerDuty Events v2 and Twilio SMS use a backend-only durable
outbox. Operator configuration binds stable target IDs to environments, an authorized
owner/admin, explicit recipient consent and Vault secret references. No tokens are
stored in target configuration or supplied to AI. This configuration is privileged
deployment configuration, not an API that accepts arbitrary Vault references.

Enqueue deduplicates incident/target pairs. Dispatch rechecks current membership,
incident state and the entire target fingerprint, then claims once with a per-target
rate limit and audit record. Removed or changed targets cancel queued work. Provider
timeouts or interrupted claims become unknown and are not automatically retried.
Only provider acceptance is recorded; recipient delivery/read receipts remain a
separate integration. Messages contain an incident ID, not logs or secrets.

Migration `20261004000001` adds the RLS-protected backend-only queue. Existing SMTP
and WhatsApp delivery paths remain independent.

References: [Slack](https://docs.slack.dev/reference/methods/chat.postmessage),
[PagerDuty](https://docs.pagerduty.com/developer/api/reference/events-v2/send-event/create-v2-event),
[Twilio](https://www.twilio.com/docs/messaging/api/message-resource).
