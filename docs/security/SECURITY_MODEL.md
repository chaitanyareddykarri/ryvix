# Ryvix Security Model & Trust Boundaries

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


## 1. Security Philosophy & Invariants

Ryvix maintains an uncompromising, realistic security model. We recognize that AI models are non-deterministic reasoning engines that must never be treated as trusted security kernels.

### Core Tenets:
1. **The AI is an Untrusted Worker**: The AI is never trusted with raw credentials, direct database mutations, or unmediated command execution.
2. **Deterministic Security Controls**: Authentication, authorization, rate limiting, and network policies are enforced deterministically by standard software engineering controls in the Ryvix Backend and Supabase.
3. **No Hidden Shells**: Ryvix avoids unrestricted reverse shells or raw SSH tunneling to customer hosts. Operations must map to typed capability contracts.
4. **Transparent Auditability**: Every operation is logged with cryptographically verifiable timestamps and parameter hashes.

---

## 2. Trust Zones & Boundaries

```
[ ZONE 0: Public Internet ]
  - Web users, WhatsApp messages, incoming webhooks.
  - Mitigated by: WAF, rate limiters, HMAC signature validators, Supabase Auth.
       │
       ▼
[ ZONE 1: Ryvix Control Plane (Backend & Supabase) ]
  - Enforces RBAC, RLS, Task state, tool dispatch, and audit logging.
  - Highly trusted; houses KMS credential keys and database master connections.
       │
       ▼
[ ZONE 2: Intelligence Layer (AI Model / Hugging Face) ]
  - Processes token streams and outputs plans/diffs.
  - Zero access to customer infrastructure or raw secrets.
       │
       ▼
[ ZONE 3: Execution Sandboxes (Workers & Workspaces) ]
  - Ephemeral containers running non-root code builds and tests.
  - Isolated network namespaces; destroyed upon task termination.
       │
       ▼
[ ZONE 4: Customer Host Environment ]
  - Customer virtual machines and containers.
  - Protected by non-root internal connector daemon and strictly whitelisted actions.
```
