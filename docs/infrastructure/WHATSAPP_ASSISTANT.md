# WhatsApp assistant implementation

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
valid. This is context, not authority to execute: existing inbox review remains
required. Future routing must revalidate the phone link and permissions when acting.
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

## Remaining phases

1. Durable message processor and reply sender, with per-recipient service-window
   tracking, signed receipts, duplicate prevention and uncertain-send handling.
2. Existing LLM gateway integration with authorized task/server/repository context,
   per-user conversation history, quotas and structured intent validation.
3. Clarified and confirmed coding requests, persisted task updates and notification
   preferences. Report queued/completed only from actual persisted task state.
4. Authentication-bound approval links; later scoped, expiring interactive approval
   tokens. A bare YES never approves an unspecified release or server operation.
5. Real Meta/LLM/worker/browser acceptance, with measured delivery and provider usage.

Account linking does not implement these later phases or train an external model.

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
