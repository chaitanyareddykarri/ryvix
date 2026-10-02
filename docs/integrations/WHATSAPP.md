# WhatsApp Integration Specification

## Implementation checkpoint — 2026-10-02

Gmail uses read-only OAuth polling into a reviewed inbox. WhatsApp supports signed
inbound proposals and durable P1 template alerts with signed receipts. Full
two-way WhatsApp LLM chat, mobile approvals, Gmail push and replies remain future
work. Security/deployment email uses Resend to the confirmed account address,
including Gmail recipients; receiving it does not require Gmail OAuth.

See the [current project status](../PROJECT_STATUS.md) for the
implemented scope, migration checkpoint, verification evidence and remaining work.
The specification below also includes target design; it is not evidence that
every described capability is implemented or live-verified.


> Current implementation: see ../infrastructure/CHANNELS_AND_LEARNING.md and
> ADR-022 and ADR-026. Signed inbound messages become reviewed proposals. P1
> template dispatch now uses a durable outbox and signed delivery receipts.
> Live delivery is unverified. Two-way LLM chat and mobile approvals remain future work.

## 1. Scope & Operational Role

WhatsApp serves as Ryvix's **real-time mobile alert and operational control channel**. It is specifically optimized for urgent on-call incidents, interactive approval gates, and quick status inquiries when engineers are away from their workstations.

---

## 2. Technical Architecture

- **Provider**: Meta WhatsApp Cloud API; a Twilio adapter is not implemented.
- **Service Boundary**: All WhatsApp messaging is isolated behind `services/communication/whatsapp`. The AI Model emits abstract communication payloads; the WhatsApp service handles formatting, button creation, and API transmission.
- **Webhook Ingestion**: Inbound messages from WhatsApp arrive at `/api/webhooks/whatsapp`. Payloads are verified using HMAC-SHA256 signatures before processing.

---

## 3. Planned interactive message types (not implemented)

1. **Urgent Incident Alerts**:
   - Sent when a server is down, high-severity security anomaly is detected, or a CI/CD build fails.
   - Includes quick-action interactive buttons: `[Approve Reboot]`, `[Acknowledge]`, `[Silence 1h]`.
2. **Interactive Approvals**:
   - Out-of-band recovery approval or production deployment sign-offs.
3. **Conversational Status Queries**:
   - User texts: *"Status web-01"* -> Ryvix returns CPU, memory, uptime, and last deployment timestamp.

---

## 4. Cost & Rate Limit Management

- **Production Economics**: Check current Meta pricing for the selected message category and recipient country before rollout. P1 sends use an approved template and opted-in recipients; this implementation does not promise conversation-based billing or group incidents into a conversation.
- **Throttling**: High-volume, non-critical logs are strictly filtered out; only actionable alerts and user-initiated dialogues are transmitted via WhatsApp.
