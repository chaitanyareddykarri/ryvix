# Supabase Platform Integration Specification

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


## 1. Managed Data Foundation

Ryvix uses **Supabase** as its core managed application and data foundation. Supabase provides enterprise-grade infrastructure without requiring a duplicate, unmanaged PostgreSQL deployment.

```
+-----------------------------------------------------------+
|                     SUPABASE FOUNDATION                   |
|                                                           |
|  +----------------+  +-----------------+  +------------+  |
|  | Supabase Auth  |  | PostgreSQL DB   |  | Realtime   |  |
|  | - JWT Sessions |  | - Core Schema   |  | - Web Chat |  |
|  | - GitHub OAuth |  | - Strict RLS    |  | - Telemetry|  |
|  | - Magic Links  |  | - Migrations    |  | - Statuses |  |
|  +----------------+  +-----------------+  +------------+  |
|                                                           |
|  +----------------+  +-----------------+                  |
|  | Storage Buckets|  | Edge Functions  |                  |
|  | - Previews     |  | - Webhooks      |                  |
|  | - Build Logs   |  | - Lightweight   |                  |
|  +----------------+  +-----------------+                  |
+-----------------------------------------------------------+
                             ^
                             | Service Role Key / Direct Connection
                             v
+-----------------------------------------------------------+
|                    RYVIX WORKER ENGINE                    |
|      (Heavy AI jobs, Coding Sandboxes, Stream Pipelines)  |
+-----------------------------------------------------------+
```

---

## 2. Core Service Boundaries

1. **Supabase PostgreSQL**:
   - Stores all application entities: users, projects, repositories, tasks, model runs, tool calls, audit logs, and security events.
   - Enforces multi-tenancy at the database level using PostgreSQL Row Level Security (RLS).
2. **Supabase Auth**:
   - Manages user identities, secure JWT issuance, session refresh tokens, and multi-factor authentication (MFA).
3. **Supabase Realtime**:
   - Powers instantaneous streaming updates in the Web Console: live thought traces, task status changes, and server health sparklines.
4. **Supabase Storage**:
   - Hosts static ephemeral frontend preview bundles, build logs, and compressed diagnostic packages.
5. **Execution Boundary**:
   - Lightweight webhook receivers may run in Supabase Edge Functions.
   - Heavy, long-running processes (AI inference loops, workspace container builds, telemetry stream ingestion) remain strictly within **Ryvix Workers**, preventing serverless execution timeouts.
