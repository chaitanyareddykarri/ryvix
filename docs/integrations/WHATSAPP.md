# WhatsApp Integration Specification

## 1. Scope & Operational Role

WhatsApp serves as Ryvix's **real-time mobile alert and operational control channel**. It is specifically optimized for urgent on-call incidents, interactive approval gates, and quick status inquiries when engineers are away from their workstations.

---

## 2. Technical Architecture

- **Provider**: Meta WhatsApp Cloud API (or Twilio for WhatsApp Business API).
- **Service Boundary**: All WhatsApp messaging is isolated behind `services/communication/whatsapp`. The AI Model emits abstract communication payloads; the WhatsApp service handles formatting, button creation, and API transmission.
- **Webhook Ingestion**: Inbound messages from WhatsApp arrive at `/api/webhooks/whatsapp`. Payloads are verified using HMAC-SHA256 signatures before processing.

---

## 3. Supported Message Types

1. **Urgent Incident Alerts**:
   - Sent when a server is down, high-severity security anomaly is detected, or a CI/CD build fails.
   - Includes quick-action interactive buttons: `[Approve Reboot]`, `[Acknowledge]`, `[Silence 1h]`.
2. **Interactive Approvals**:
   - Out-of-band recovery approval or production deployment sign-offs.
3. **Conversational Status Queries**:
   - User texts: *"Status web-01"* -> Ryvix returns CPU, memory, uptime, and last deployment timestamp.

---

## 4. Cost & Rate Limit Management

- **Production Economics**: WhatsApp Business messages incur per-conversation charges. Ryvix groups related alert notifications into a single active 24-hour conversation window to optimize operating costs.
- **Throttling**: High-volume, non-critical logs are strictly filtered out; only actionable alerts and user-initiated dialogues are transmitted via WhatsApp.
