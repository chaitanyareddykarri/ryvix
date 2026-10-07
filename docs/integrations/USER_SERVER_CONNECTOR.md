# User Server Connector Specification

## October 7 implementation update

Server enrollment now offers explicit project/environment creation without
GitHub for owner/admin/developer members. Setup is tenant-scoped, audited and
rate-limited. Enrollment remains separate; fresh signed telemetry is needed to
report connection. Fleet handles unknown/unreachable states and reconnects.
Hosted concurrency and actual agent installation remain acceptance work.

## Implementation status - October 7, 2026

Hosted migrations are applied through `20261007000001`; no numbered migrations
remain pending at the latest rollout. See [project status](../PROJECT_STATUS.md)
for completed UI, authentication, team, repository and fleet work and recorded
verification. The [pending queue](../PENDING_WORK.md) separates unfinished code,
deployment configuration and live acceptance. Design details below describe
scope, not production certification.

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
