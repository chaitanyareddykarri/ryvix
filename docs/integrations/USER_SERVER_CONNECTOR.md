# User Server Connector Specification

## Implementation checkpoint — 2026-10-03

Code checkpoint: `d81b281`; applied migrations through `20261003000004`.
Implemented: reviewed experience/personal memory, bounded repository indexing,
Gmail SMTP email, WhatsApp OTP identity, opt-in AI replies/history/quotas, confirmed
coding requests, task notifications and authenticated approval handoffs. Releases
and server operations retain their existing web authorization and approval checks.
Recorded verification: 79 project suites plus 15 Node checks, typecheck/lint/build
and 125 database boundary checks passed. Provider delivery, deployed workers/browser
acceptance and representative model accuracy remain unverified.

See [project status](../PROJECT_STATUS.md), [assistant setup](../infrastructure/WHATSAPP_ASSISTANT.md) and
[recorded verification](../verification/WHATSAPP_ASSISTANT_2026_10_03.md). This documentation update did not rerun those
code checks. Detailed designs below may include planned capabilities; the status
index distinguishes implemented behavior from future work.


## 1. System Overview

The **User Server Connector** system establishes a secure bridge between Ryvix and customer infrastructure. It allows Ryvix to observe runtime performance, collect logs, detect security events, and execute authorized recovery operations without requiring incoming SSH access or granting unrestricted root privileges.

---

## 2. Enrollment & Handshake Lifecycle

```
[ Customer Console ]
  - Clicks "Connect Server" -> Ryvix generates single-use enrollment token:
    `enroll_tok_92f1b8c0...` (expires in 15 minutes)
       │
       ▼
[ Host Installation ]
  - Customer runs installation script on target Linux server or container host:
    `curl -sSL https://get.ryvix.io | sudo bash -s -- --token enroll_tok_92f1b8c0...`
       │
       ▼
[ Cryptographic Key Generation & Enrollment ]
  - Agent generates local ed25519 keypair
  - Sends enrollment request to Ryvix Gateway:
    `POST /api/connector/enroll { enrollment_token, public_key, host_metadata }`
       │
       ▼
[ Ryvix Gateway Verification ]
  - Validates token against database; marks token consumed
  - Generates unique `server_id` and signs enrollment certificate
  - Stores public key in `server_connectors` table in Supabase
       │
       ▼
[ Persistent Outbound Connection Established ]
  - Agent establishes persistent outbound TLS 1.3 WebSocket connection
  - Handshake authenticated via signed nonce challenge
  - Real-time telemetry streaming begins immediately
```

---

## 3. Connector Permissions & Capability Manifest

The agent enforces a local **Capability Manifest** that restricts executable actions:
- `metrics:read`: Collect system resources and process stats.
- `logs:tail`: Read systemd journal and application logs.
- `service:restart`: Restart explicitly declared service names.
- `container:restart`: Cycle specified container IDs.

Any command not explicitly defined in the manifest is rejected locally by the daemon, regardless of what instruction is dispatched by the backend.
