# Ryvix Audit & Compliance Architecture

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


## 1. End-to-End Audit Chain

Every action executed by Ryvix maintains an uninterrupted, verifiable chain of custody:

```
[ 1. User Request ]
  Timestamp, user_id, channel (Web/WhatsApp/Gmail), raw prompt
       │
       ▼
[ 2. AI Plan Generation ]
  Model version, prompt hash, structured plan steps, token consumption
       │
       ▼
[ 3. Tool Invocations ]
  Tool name, input arguments hash, target resource ID
       │
       ▼
[ 4. Code Modifications & Sandboxed Execution ]
  Unified diff content, files changed, build logs, test outputs
       │
       ▼
[ 5. Ephemeral Preview ]
  Preview URL, bundle hash, generation timestamp
       │
       ▼
[ 6. Customer Authorization ]
  Approver user_id, channel, cryptographic signature, approval timestamp
       │
       ▼
[ 7. Production Action ]
  GitHub commit SHA / PR link / Connector command output
       │
       ▼
[ 8. Post-Deployment Verification ]
  Runtime health status, error rates, confirmation timestamp
```

---

## 2. Audit Table Immutability & Protection

All audit events are stored in the PostgreSQL `audit_events` table managed via Supabase:
- **Append-Only Policies**: PostgreSQL permissions explicitly revoke `UPDATE` and `DELETE` privileges for all database roles (including application service accounts).
- **Cryptographic Hashes**: Every record contains a SHA-256 hash of its parameters, preventing undetectable tampering of historical records.
- **Export & Compliance**: Customers can export immutable audit logs in CSV or JSONL format for SOC2, ISO 27001, and HIPAA compliance reviews.
