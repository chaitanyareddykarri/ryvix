# Scheduled Gmail intake

The existing Google read-only OAuth connector can now be polled by a separate
worker. Messages remain untrusted inbox proposals and require existing review
before a coding task is created. This does not send Gmail replies or implement
Google Pub/Sub push notifications. Application OTP/alert mail still uses SMTP.

1. Connect Gmail through the authenticated Channels page using an owner/admin.
2. Put the connector UUID in the comma-separated RYVIX_GMAIL_POLL_CONNECTORS
   allowlist (1–50 accounts). Set RYVIX_GMAIL_POLL_ENABLED=true.
3. Configure verified-TLS DATABASE_URL / DATABASE_CA_CERT and the existing
   GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET in the worker's ignored secret environment.
   Refresh tokens remain in Vault. Use NODE_ENV=production on deployed workers.
4. Run `npm run worker:gmail -- --once` for a configured startup/poll check, then
   install infrastructure/ryvix-gmail.service with /etc/ryvix/gmail.env.

Each cycle polls allowed connectors sequentially and waits 60 seconds. Active
connector state and current owner/admin membership are checked before dispatch;
the existing credential resolver independently rechecks authorization. A session
advisory lock prevents overlapping scheduled polls of the same connector. Existing
inbox deduplication and cursor compare-and-swap also protect concurrent manual polls.
Provider failures increment a sanitized failure count and leave incomplete cursors
unchanged. Invalid/revoked accounts are skipped. Shutdown stops before another account;
an in-flight bounded provider request can finish first.

Consent/authorization is the existing connected account plus explicit deployment
allowlist. Removing a connector from the list and restarting disables scheduled
polling; disconnecting/revoking the account is rechecked on every cycle.

Acceptance still requires a real linked mailbox and test message: verify one inbox
proposal, duplicate suppression, cursor progress, revocation and task review.
Mocked worker tests do not prove Google delivery. Expired history/backlogs retain
the existing reconnect/manual-review behavior rather than silently skipping mail.
