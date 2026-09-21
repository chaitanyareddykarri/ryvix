# Ryvix Security Model & Trust Boundaries

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
