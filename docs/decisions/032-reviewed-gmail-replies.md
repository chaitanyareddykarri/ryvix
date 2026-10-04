# ADR 032: Authenticated Gmail push and reviewed replies

Gmail Pub/Sub notifications verify Google's OIDC signature, issuer, audience,
verified service account and subscription. They only wake the existing allowlisted,
owner-authorized poller. Notification history IDs cannot advance mailbox cursors.
The worker acknowledges only events observed before a successful poll and renews
explicitly enabled watches before expiry. Polling remains the recovery path.

Reply permission requires a separate OAuth grant for `gmail.send`. Incoming mail
does not authenticate a Ryvix user. The authenticated mailbox owner reviews an
immutable, expiring draft with its exact recipient, thread and body. AI drafts use
only the sanitized incoming message and cannot invoke project tools. Sending claims
the draft once under current membership/connector locks and records an audit event.
Ambiguous provider outcomes become `unknown` and are never automatically retried.
`accepted` means Gmail accepted the request, not confirmed recipient delivery.

Migration `20261003000007` adds backend-only, RLS-protected event/draft tables and
explicit account capabilities. Application OTP and alert mail continue using SMTP.

References: [Gmail watch](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/watch),
[authenticated Pub/Sub push](https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions).
