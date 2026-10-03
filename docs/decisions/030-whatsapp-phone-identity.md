# ADR 030: Verified WhatsApp identity

Link a personal number to an authenticated user within one organization and its
connected WhatsApp business number. OTP possession never grants a role. Recheck
current membership and connector ownership for verification and inbound identity.
Unlinked messages retain the existing untrusted proposal flow.

OTP challenges use a keyed digest, ten-minute expiry, five verification attempts,
one-minute resend cooldown and durable hourly send limits. Codes remain in memory
only during the bounded synchronous Meta request; no plaintext OTP is persisted.
Persist before dispatch. Unknown delivery is not automatically retried. Resend
invalidates the previous challenge. Single-use consumption and unique phone links
are transactional. Unlink removes challenges and pending inbox attribution.

New tables are backend-only with RLS. Audit records contain identifiers, not phone
numbers or OTP values. Full assistant routing and message replies are later phases.
