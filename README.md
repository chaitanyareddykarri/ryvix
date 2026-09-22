# Ryvix — Autonomous Software & Infrastructure Operations Platform

> **Status**: **Phase 1 & Phase 2 Fully Implemented, Tested & Live**  
> **Database**: PostgreSQL 17.6 on Supabase (All 35 Tables Active, 100% RLS Enforced)  
> **Master Test Suite**: 9/9 Suites Passing (28+ Tests, 0 Failed)  
> **Web Application**: Next.js 15.5 App Router running on `http://localhost:3000`

---

## 1. Overview

**Ryvix** is an AI-powered autonomous software and infrastructure operations platform. A customer connects an existing software project, GitHub repository, deployed application, and authorized infrastructure. Ryvix:
1. **Analyzes** the project and its running environment, detecting technology stacks, frameworks, build systems, and runtime characteristics.
2. **Establishes** and manages controlled dual-path connector relationships (Internal agent daemon + Out-of-Band external cloud recovery controller).
3. **Modifies & Verifies Software** autonomously via stack-aware ephemeral coding workspaces (`ryvix_sbx_*`), generating live frontend previews and opening GitHub Pull Requests.
4. **Monitors & Self-Heals** systems by streaming zero-inbound TLS telemetry, pairing deterministic capability whitelisting with out-of-band cloud hypervisor resets.

---

## 2. Core Operational Pipelines

```
                             CUSTOMER INTERFACE
                  (Web Console / WhatsApp / Email Webhook)
                                     │
                                     ▼
                        RYVIX BACKEND ORCHESTRATOR
                                     │
          ┌──────────────────────────┴──────────────────────────┐
          │                                                     │
          ▼                                                     ▼
   PATH 1: AI CODING                                    PATH 2: INFRASTRUCTURE
 & WORKSPACE PIPELINE                                   & SERVER CONNECTORS
          │                                                     │
 ┌────────┴────────┐                                   ┌────────┴────────┐
 ▼                 ▼                                   ▼                 ▼
AI REASONING     DOCKER SANDBOX                   IN-HOST DAEMON       OUT-OF-BAND
(Hugging Face)   (Ephemeral 3100+)               (Zero-Inbound TLS)    (Cloud API)
- Tool-schema    - Repo analyzer                 - Systemd units       - AWS / DO / Hetzner
- Multi-runtime  - Diff application              - Container ops       - Hypervisor probes
- PR automation  - Live preview proxy            - Whitelist gate      - Hard power-cycle
```

---

## 3. Implementation Status Across Paths

### Path 1: The AI Coding & Workspace Pipeline (Phases 1–4 Complete)
- **Phase 1 (Web Console & Task Dashboard)**: Interactive console at `/tasks` with prompt submission, step-by-step reasoning plan viewer, live sandbox preview iframe, and PR creator.
- **Phase 2 (Repository Analyzer & Stack Detector)**: `RepositoryAnalyzer` in `backend/src/connectors/github.connector.ts` detecting Next.js, Node.js, Python/FastAPI, Go, Rust, and Docker.
- **Phase 3 (Docker Sandbox Execution Engine)**: `DockerWorkspaceManager` in `services/src/workspace/docker-workspace.manager.ts` managing isolated containers with cgroups (1-2 CPU, 2-4GB RAM), ephemeral preview ports (`3100+`), and 15-minute runtime ceilings.
- **Phase 4 (Live Preview & PR Pipeline)**: `PullRequestService` in `backend/src/services/pr.service.ts` opening GitHub PRs with atomic branch names and structured code diff metrics.

### Path 2: Server Connectors & Autonomous Host Daemons (Phases 1–4 Complete)
- **Phase 1 (Server Fleet Console & Enrollment)**: Interactive dashboard at `/servers` with fleet metrics (CPU, RAM, Disk, Systemd units) and one-click shell enrollment generator (`curl ... | sudo bash`).
- **Phase 2 (Internal Host Daemon & Whitelist Engine)**: `InternalAgent` in `services/src/connector/internal-agent.ts` with outbound-only TLS telemetry, HMAC-SHA256 enrollment tokens, and capability whitelisting (`service.restart`, `container.restart`, `disk.cleanup_temp`, `logs.fetch`).
- **Phase 3 (Out-of-Band Cloud Recovery Bridge)**: `CloudRecoveryBridge` in `services/src/connector/cloud-recovery.bridge.ts` providing hypervisor status checks and out-of-band hard reset across AWS EC2, DigitalOcean, Hetzner, and GCP.
- **Phase 4 (Automated Self-Healing & Verification)**: Differential diagnosis engine distinguishing between daemon crashes, kernel panics/OOM lockups, and provider outages, dispatching authorized recovery steps.

---

## 4. Live Database & Schema Architecture

- **Engine**: PostgreSQL 17.6 on Supabase (`db.tsoyrpgifovzwqtgpkkb.supabase.co:5432`)
- **Tables**: **35 tables** in `public` schema (100% parity with all 3 version-controlled SQL migrations)
- **Row Level Security (RLS)**: **100% Enforced** across every single table
- **Foreign Keys**: 42 relational constraints active
- **Triggers**: 12 active triggers (including `on_auth_user_created` onboarding trigger)
- **Storage Buckets**: `previews` (Public) and `artifacts` (Private) provisioned

---

## 5. Verification & Testing

Run all automated test suites:
```powershell
npm.cmd run test
```

Test Results:
```text
============================================================
RYVIX RUNTIME ARCHITECTURE & DATABASE TEST SUITE
============================================================
✓ Complete 20-Point Authentication Lifecycle & Security Test Suite PASSED
✓ End-to-End Server Outage & Differential Diagnosis Test PASSED
✓ End-to-End Self-Healing Flow Test PASSED
✓ 3-Attempt Circuit Breaker & Anti-Looping Test PASSED
✓ Coding Workspace Expiry & Container Cleanup Test PASSED
✓ Path 1: AI Coding Workspace & PR Pipeline (Phases 1-4) ALL TESTS PASSED!
✓ Path 2: Server Connectors & Autonomous Host Daemons (Phases 1-4) ALL TESTS PASSED!
✓ API Key Cryptographic Security & Lifecycle Test PASSED
✓ Cross-Tenant RLS & Audit Immutability Test PASSED
============================================================
TEST SUMMARY: 9 PASSED | 0 FAILED
============================================================
```

Run full monorepo typecheck:
```powershell
npm.cmd run typecheck
```

Build web application:
```powershell
npm.cmd run build --workspace=@ryvix/web
```

Start local web server:
```powershell
cd web && npm.cmd run dev
```
Navigate to:
- **`http://localhost:3000/`** (Platform Dashboard)
- **`http://localhost:3000/login`** (Authentication Console)
- **`http://localhost:3000/tasks`** (AI Coding Workspace Console)
- **`http://localhost:3000/servers`** (Server Connectors Console)
