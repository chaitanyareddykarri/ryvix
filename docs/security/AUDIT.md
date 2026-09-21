# Ryvix Audit & Compliance Architecture

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
