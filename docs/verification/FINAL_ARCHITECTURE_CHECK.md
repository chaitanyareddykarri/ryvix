# Gate 7: Complete Architecture Verification & Invariant Audit

## 1. Executive Summary

This document concludes the **Final Pre-Migration Architecture Gate** for Ryvix. It provides empirical verification that the repository strictly honors the architectural separation of concerns, isolation boundaries, multi-channel capabilities, telemetry ingestion, attack detection, autonomous self-healing, and security invariants required before executing the Phase 1 Supabase migration.

Ryvix is an **Autonomous Software & Infrastructure Operations Platform**. It is not merely a web/chat UI, but a complete operational platform capable of receiving requests from multiple channels, creating isolated coding environments, monitoring live customer servers, detecting anomalies and attacks, diagnosing failures, executing approved self-healing remediations, and maintaining an immutable audit ledger.

---

## 2. Complete End-to-End System Topology

```
                                    USER
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                 Ryvix Web       WhatsApp           Gmail
             (Next.js App)   (Meta Cloud API)  (OAuth 2.0 Webhook)
                    │                │                │
                    └────────────────┼────────────────┘
                                     │
                                     ▼
                               RYVIX BACKEND
                                     │
                     ┌───────────────┼───────────────┐
                     │               │               │
                    AI          Connectors       Security
                     │               │               │
                     ▼               ▼               ▼
              LLM Providers       External       Auth / RBAC
             (HF, OpenAI, etc.)   Systems
                     │
                     ▼
               AI ORCHESTRATOR
                     │
              ┌──────┼─────────┐
              │      │         │
            Plan   Tools    Verification
              │      │         │
              └──────┼─────────┘
                     │
                     ▼
               EXECUTION ENGINE
                     │
       ┌─────────────┼─────────────────────┐
       │             │                     │
    GitHub        Coding              Server Ops
  Integration    Workspace         (Internal/External)
       │             │                     │
       ▼             ▼                     ▼
   Code Repo      Docker              Logs / Metrics
                 Sandbox                   │
                                           ▼
                                    DETECTION ENGINE
                                           │
                                    ┌──────┴──────┐
                                    │             │
                                 Normal       Incident
                                                  │
                                                  ▼
                                           DIAGNOSIS ENGINE
                                                  │
                                                  ▼
                                            RECOVERY PLAN
                                                  │
                                             Authorization
                                                  │
                                                  ▼
                                           RECOVERY ACTION
                                                  │
                                                  ▼
                                            VERIFICATION
                                                  │
                                         ┌────────┴────────┐
                                         │                 │
                                      Recovered          Failed
                                         │                 │
                                         ▼                 ▼
                                    Audit Ledger       Escalation
```

---

## 3. Core Tripartite Subsystem Boundaries

| Subsystem | Architectural Role | Boundary Verification Check | Status |
| :--- | :--- | :--- | :--- |
| **`web/`** | Presentation layer (Next.js 15 App Router). Uses client-safe public keys and `@supabase/ssr` HTTP-only session cookies. | Verified: Does **not** hold `SUPABASE_SERVICE_ROLE_KEY`. Does not communicate directly with the AI layer or customer infrastructure. | **VERIFIED** |
| **`backend/`** | Central control plane. Enforces authentication, RBAC, tenant isolation, capability mediation, tool execution, and audit logging. | Verified: All database state queries pass through [`backend/src/tools/task-tools.ts`](../../backend/src/tools/task-tools.ts). Enforces tenant checks and records events to `audit_events`. | **VERIFIED** |
| **`ai/`** | Stateless reasoning engine. Decomposes tasks into structured plans and proposes tool invocations. | Verified: [`ai/src/orchestrator.ts`](../../ai/src/orchestrator.ts) contains **zero** database connection logic, zero Supabase clients, and zero infrastructure credentials. | **VERIFIED** |
| **`packages/database/`** | Shared type definitions and server/client database factories. | Verified: [`createServerDatabaseClient`](../../packages/database/src/client.ts) includes hard runtime guards against browser execution. Types match 100% of Phase 1 SQL schema. | **VERIFIED** |

---

## 4. Multi-Channel Connectors & Credential Isolation

```
External Systems:
(GitHub, Gmail, WhatsApp, Customer Servers)
       │
       ▼
   Connectors (Ingestion & Protocol Normalization)
       │
       ▼
   Backend Authorization (RBAC, Multi-Tenant Checks, Secret Decryption)
       │
       ▼
     Tools (Controlled Execution Handlers)
       │
       ▼
      AI (Reasoning & Intent Generation)
```

1. **Zero External Secrets in AI Context**: API tokens for GitHub, WhatsApp, Gmail, AWS, and server SSH keys reside strictly in backend environment vaults. They are injected at execution time by authorized backend tool handlers and are never passed to the LLM.
2. **Channel Parity**: Tasks originating from WhatsApp or Gmail are normalized into standard `tasks` records (`channel IN ('web', 'whatsapp', 'gmail')`) and processed through the identical planning and authorization pipeline as Web tasks.

---

## 5. Coding Sandbox Isolation Flow

```
Customer Repository (GitHub)
       ↓
Stack Detection (Languages, Package Managers, Frameworks)
       ↓
Workspace Profile (Node, Python, .NET, Rust, etc.)
       ↓
Isolated Docker Workspace (Ephemeral Container, Non-Root UID 1000, cgroups)
       ↓
AI (Code Modifications via Controlled Tool / AST Diff)
       ↓
Build / Test (Execution strictly within sandbox)
       ↓
Preview (Ephemeral frontend preview port forwarding)
```

1. **Host Invariant**: Customer code **never** executes directly on the Ryvix host runner.
2. **Resource Constraints**: Cgroup limits enforce 2 vCPUs, 4GB RAM, 15-minute runtime ceiling, and restricted egress.
3. **No Docker Socket Mounting**: `/var/run/docker.sock` is never mounted inside customer sandboxes, preventing container breakout attacks.

---

## 6. Telemetry, Attack Detection & Autonomous Self-Healing

1. **Two-Tier Detection**:
   - **Tier 1 (Deterministic Fast-Path)**: Real-time stream rules detect SSH brute force (>20 failed attempts/60s), credential stuffing, unauthorized privilege escalation (`sudo su`), cryptominers (`xmrig`), and resource saturation (>98% CPU/RAM).
   - **Tier 2 (AI Forensic Context)**: Correlates detected alerts with recent git commits, deployment diffs, and process trees to identify root causes.
2. **Multi-Level Recovery**:
   - *Tier 1 (Diagnostic)*: Non-destructive process tree and log queries (auto-approved).
   - *Tier 2 (In-Band Soft Recovery)*: Service restarts (`systemctl restart`), log truncation, firewall IP blocking (`ufw deny`).
   - *Tier 3 (Process Isolation)*: Killing rogue PIDs (`kill -9`).
   - *Tier 4 (Out-of-Band Cloud Recovery)*: Hypervisor hardware reboot via AWS EC2 / GCP Compute APIs when the in-band agent is frozen.
3. **Human-in-the-Loop Gating**: Destructive actions (restarts, kills, firewall modifications, reboots) halt and dispatch an interactive authorization card to the Web console and WhatsApp.
4. **Post-Recovery Verification & Audit**: Re-evaluates health checks (`HTTP 200`, CPU returned to normal) and records the entire incident lifecycle in `public.audit_events`.

---

## 7. Extensibility Registries (Zero Hard-Coding)

The architecture prevents vendor lock-in and stack rigidity through five core registries:
* **`ModelProviderRegistry`**: Pluggable support for Hugging Face, OpenAI, Anthropic, and local vLLM.
* **`ConnectorRegistry`**: Pluggable connectors for GitHub, WhatsApp, Gmail, Slack, and cloud APIs.
* **`ToolRegistry`**: Whitelisted, schema-validated tools mediating all AI actions.
* **`WorkspaceProfileRegistry`**: Stack-specific sandbox builders (Node, Python, .NET, Rust, Go).
* **`DeploymentAdapterRegistry`**: Pluggable deploy targets (Docker, Vercel, AWS ECS, Kubernetes).

---

## 8. Database Architecture & Authentication Status

### Phase 1 Core Entities
- 6 Tables: `organizations`, `profiles`, `projects`, `tasks`, `plans`, `audit_events`.
- 100% Row Level Security (RLS) enforcement.
- Automated `set_updated_at()` trigger functions.
- B-Tree composite performance indexes.
- Audit ledger immutability (`REVOKE UPDATE, DELETE`).

### Email OTP Authentication & Onboarding Invariant
- **Auth Provider**: Supabase Auth with 6-digit Email OTP codes and `@supabase/ssr` cookies.
- **Onboarding Trigger Requirement**: Because `profiles.organization_id` has a `NOT NULL` constraint, an automated PostgreSQL trigger (`on_auth_user_created`) must be registered on `auth.users` to automatically create an initial personal organization and profile upon first OTP verification.

---

## 9. Final Readiness Verdict

All 7 pre-migration architecture gates have been rigorously inspected and documented:

| Gate | Focus Area | Status | Reference Document |
| :--- | :--- | :--- | :--- |
| **Gate 1** | Docker Architecture & Container Boundaries | **PASSED** | [`DOCKER_ARCHITECTURE_AUDIT.md`](./DOCKER_ARCHITECTURE_AUDIT.md) |
| **Gate 2** | Hard-coding & Extensibility Registries | **PASSED** | [`EXTENSIBILITY_AUDIT.md`](./EXTENSIBILITY_AUDIT.md) |
| **Gate 3** | Connector Architecture & Capability Model | **PASSED** | [`CONNECTOR_ARCHITECTURE_AUDIT.md`](./CONNECTOR_ARCHITECTURE_AUDIT.md) |
| **Gate 4** | Coding Workspace Isolation & Stack Profiles | **PASSED** | [`CODING_WORKSPACE_ARCHITECTURE_AUDIT.md`](./CODING_WORKSPACE_ARCHITECTURE_AUDIT.md) |
| **Gate 5** | Database RLS, Security Policies & Triggers | **PASSED** | [`RLS_SECURITY_REVIEW.md`](./RLS_SECURITY_REVIEW.md) |
| **Gate 6** | Schema & Migration Code Compatibility | **PASSED** | [`FINAL_MIGRATION_READINESS.md`](./FINAL_MIGRATION_READINESS.md) |
| **Gate 7** | Full Architecture Separation & Self-Healing Audit | **PASSED** | [`FINAL_ARCHITECTURE_CHECK.md`](./FINAL_ARCHITECTURE_CHECK.md) |

**THE REPOSITORY IS IN FULL ARCHITECTURAL COMPLIANCE AND FULLY PREPARED FOR THE PHASE 1 MIGRATION.**
