# WhatsApp assistant implementation

## Contact onboarding (2026-10-06)

The dashboard prompts on each visit until a valid profile number is saved. Later
or Escape dismisses the current prompt; Phone / WhatsApp beside the profile opens
management. `/api/profile/contact` saves the caller's unverified contact through
the authenticated RLS client, without requiring a business connector or sending.
OTP controls are available in the popup after saving and on `/profile/whatsapp`.
Verification, assistant opt-in and alert consent remain separate. Changing the
profile contact does not automatically change or remove verified connector links.
See [local evidence and remaining acceptance](../verification/PHONE_ONBOARDING_2026_10_06.md).

## Phase 1: phone identity (2026-10-03)

Implemented `/profile/whatsapp`, linked from `/channels`, and authenticated
`/api/profile/phone` actions: send, verify and remove. An owner/admin must first
connect the business number through the existing channel connection flow.

The user selects a business connector and requests an OTP to their personal
international number. A successful code verification links that number to their
user, organization and connector. Different business connectors are separate
identity scopes; the same phone cannot identify two users on one connector.

Codes use cryptographic randomness and a keyed digest tied to the challenge ID.
They expire in ten minutes, permit five attempts and are consumed atomically.
Requesting another code invalidates the previous one. There is a one-minute resend
cooldown and five sends per hour per organization/user and organization/phone.
Digests and delivery state are stored; plaintext codes are never persisted or logged.
The synchronous send has a bounded provider timeout. Unknown delivery is not retried
automatically, but a received code can still be verified. This phase does not use
the P1 alert outbox to send OTPs.

Verified inbound messages receive user attribution only while membership remains
valid. This is context, not authority to execute. Disabled assistant messages retain
reviewed inbox handling; enabled routing revalidates the phone link and permissions.
Unlink removes challenges and clears attribution on pending messages. Historical
accepted/rejected message records are retained. Phone numbers are backend-only
personal data and must not be included in model prompts unnecessarily.

Apply `20261003000003_whatsapp_phone_identity.sql` before deploying the updated
inbox code. Both new tables have RLS and deny direct browser access.

Required later for live OTP delivery:

- Existing Meta app, business phone connector, Vault token and Graph API version.
- `WHATSAPP_OTP_TEMPLATE`: approved authentication template with a body code and
  copy-code button. The sender supplies the same code in body and URL-button fields.
- `WHATSAPP_OTP_LANGUAGE`, default `en_US`, matching the configured template.
- `WHATSAPP_OTP_SECRET`: separate random secret of at least 32 characters.
- Public signed webhook and a consenting test user's personal number.

There is no free-OTP allowance assumed in this implementation. Provider setup and
real OTP receipt remain a final deployment acceptance step. Receiving an OTP does
not itself establish a user-initiated service-message window.

## Assistant phases implemented (migration 20261003000004)

1. Durable message processor and reply sender, with per-recipient service-window
   tracking, signed receipts, duplicate prevention and uncertain-send handling.
2. Existing LLM gateway integration with authorized task/server/repository context,
   per-user conversation history, quotas and structured intent validation.
3. Clarified and confirmed coding requests, persisted task updates and notification
   preferences. Report queued/completed only from actual persisted task state.
4. Authentication-bound approval handoffs. Task and release links select the exact
   task; recovery links select the request. Existing role, independent approval,
   expiry, reviewed-commit and target checks remain authoritative. A bare YES never
   approves a release or server operation. Direct mobile merge/reboot is excluded.

Open `/channels/assistant` after verifying a number, enable the assistant and
separately opt into task notifications. Owners/admins/developers can use it within
the connected project. Unlinked/disabled messages retain the existing reviewed
inbox path. Existing inbox records are not retrospectively imported into AI chat.

Coding requests produce a full bounded proposal (up to 1,800 characters), exact
repository name, confirmation UUID and absolute expiry. Reply `CONFIRM <uuid>` or
`REJECT <uuid>`. The backend rechecks link, current role, repository, credentials,
queue capacity and pending inbox state before atomically creating one task/job.
Confirming is not permission to open/merge a PR or deploy. Ambiguous repository
requests require clarification. Repository connection uses the authenticated web
GitHub flow; credentials must never be sent in WhatsApp.

Messages and replies remain separate from web chat, with 30-day worker retention.
Limits are 30 processed requests per user/organization/hour, six prior turns in
context, bounded source retrieval, a 90-second model deadline and at most 1,600
requested output tokens. Provider/model and actual response duration are recorded;
streaming token usage and currency costs remain unknown, not estimated as measured.
Outbox dispatch is limited to three claims per session/minute. Duplicates do not
extend the window; only valid signed provider timestamps on new messages do so.

Task updates include recorded status, unexpired preview availability, saved checks,
PR record availability, release state and matching signed deployment results.
Deployment notifications require the approved merge SHA and unchanged target
mapping. None of these implies full runtime health. Notifications are polling
snapshots, not a guaranteed journal of every intermediate transition.

Text replies require an open 24-hour service window. Outside it, opted-in proactive
updates use `WHATSAPP_ASSISTANT_UPDATE_TEMPLATE` and language (default `en_US`).
Configure one body parameter (update UUID) and a fixed dashboard URL in that
approved utility template. Private update details stay in the authenticated
dashboard. Without the template, the worker records `window_closed`.

Reply claims precede network calls. Ambiguous sends are `unknown` and are not
automatically repeated. Signed status callbacks are persisted and reconciled,
including callbacks arriving before the send result is saved. Opt-out prevents
future processing/queued sends. Unlink or re-verification deletes the assistant
session and its derived history/proposals/outbox. Already-sent messages cannot be
recalled. Context/history is not external-model training.

## Worker deployment and final live acceptance

Apply migrations through `20261003000004` before deploying the new webhook/phone
code. Install `infrastructure/ryvix-whatsapp-assistant.service` with
`/etc/ryvix/whatsapp-assistant.env`: verified-TLS database settings,
`RYVIX_WHATSAPP_ASSISTANT_ENABLED=true`, `RYVIX_PUBLIC_URL`, existing LLM credentials,
Meta Graph version and optional approved update template configuration. The worker
resolves business tokens through Vault; no token goes into model context.

Run `npm run worker:whatsapp -- --once` on the intended host for a startup check,
then run the service. It is separate from cloud/alert operations so model latency
does not block recovery dispatch. Enable each user's assistant only after setup.

Provider/deployment stage still requires real OTP receipt, signed inbound message,
AI reply and delivered receipt, correct identity/role behavior in a browser, one
confirmed coding task, task updates, preview review, authenticated release approval,
provider deployment event and Gmail SMTP notification. No local fixture proves this.
See [verification](../verification/WHATSAPP_ASSISTANT_2026_10_03.md).

## Gmail SMTP correction

Ryvix application OTP mail and account notifications now share a TLS-verified SMTP
transport. Configure `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465` (or STARTTLS 587),
`SMTP_USER`, `SMTP_PASSWORD` and optional `EMAIL_FROM` in the application runtime.
The operations worker needs the same SMTP settings for security/deployment mail.
Notification sender defaults to `SMTP_USER`; `RYVIX_NOTIFICATION_FROM` can select
another authorized bare sender address. `RYVIX_NOTIFICATION_PROVIDER=smtp` is the
default. Resend remains an explicit optional notification adapter, never an
automatic fallback after an uncertain SMTP send. Login OTP has no Resend fallback.

Hosted Supabase SMTP configuration is separate; it does not populate application
or worker environment variables. Receiving alerts at Gmail does not require Gmail
OAuth. Gmail task intake still requires its separate read-only OAuth connection.
SMTP acceptance and a Message-ID do not prove inbox delivery or enforce idempotency;
the durable notification worker preserves unknown outcomes without automatic retry.

References: [Nodemailer SMTP](https://nodemailer.com/smtp),
[Meta pricing](https://whatsappbusiness.com/products/platform-pricing/).
