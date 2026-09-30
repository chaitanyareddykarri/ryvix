# ADR-016: Persist verified GitHub deployment status events

Receive deployment_status at /api/webhooks/github using the existing server-only
GITHUB_WEBHOOK_SECRET contract. Verify HMAC-SHA256 over bounded raw bytes before
parsing. Missing configuration, invalid signatures and malformed events fail closed.
Do not treat push, workflow completion, or audit actions as deployment success.

Only repositories verified through the authorized connection service may receive
events. Migration 20260930000005 adds github_verified_at and revokes direct browser
repository mutations. Existing rows remain unverified until reconnected; do not
backfill trust. Signed GitHub repository ID and canonical full name must both match.
One repository connected to multiple authorized projects can receive the same
provider facts; no request-supplied organization or project identifier is accepted.

Persist curated immutable status events and audit entries in one transaction.
Unique repository/status and repository/delivery keys make redelivery idempotent.
Order observations by provider event time and status ID, not arrival time. No raw
payload, credentials, URL query strings or arbitrary provider descriptions enter
storage/model context. Browser reads remain mediated by tenant-authorized services.

Diagnostics expose provider-reported state, SHA, environment and timestamp.
Runtime health verification remains explicitly unavailable: a provider success is
not proof that an application is reachable or that a particular host runs that SHA.
No deployment, PR or server operation is triggered by a webhook.

Configure the secret only on the server and authorized GitHub webhook/App, with
JSON content type and deployment_status subscription. Customers must not receive
the shared application secret. Live delivery requires the public HTTPS endpoint;
local signed fixtures do not certify provider connectivity.

References: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
and https://docs.github.com/en/webhooks/webhook-events-and-payloads#deployment_status
