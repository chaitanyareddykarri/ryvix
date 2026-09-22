# Ryvix Current Project Context

## 1. Project Purpose

Ryvix is an **AI-powered autonomous software and infrastructure operations platform**. It unifies:
1. Multi-channel user interaction (**Web Chat/Dashboard, WhatsApp, Gmail, Slack**).
2. Autonomous coding agent capabilities (GitHub connection, AST inspection, stack detection, isolated Docker sandboxes, diff synthesis, build & test runs, ephemeral frontend previews).
3. Server observability and health monitoring (metrics, system logs, auth logs, process trees, systemd units).
4. Deterministic attack and failure detection (brute-force logins, credential stuffing, privilege escalation, cryptominers, resource exhaustion).
5. Controlled self-healing and incident recovery (service restarts, log truncations, UFW firewall drops, cloud hypervisor reboots) governed by a 4-tier human-in-the-loop authorization hierarchy.
6. An immutable, append-only audit ledger for compliance and forensics.

---

## 2. Active Repository Architecture

```
                    ┌───────────────────────────┐
                    │     User / Channels       │
                    │ (Web, WhatsApp, Gmail)    │
                    └─────────────┬─────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
 ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 │     WEB UI      │     │     BACKEND     │     │   AI ENGINE     │
 │ (Next.js 15 SSR)│     │(Node.js Service)│     │(Reasoning/LLMs) │
 └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
          │                       │                       │
          │   Client Session      │   RBAC, Auth, Vault   │  Controlled
          │   (Anon / JWT)        │   Service Role        │  Tool Calls
          │                       │                       │  (NO DB KEYS)
          ▼                       ▼                       ▼
  ┌────────────────────────────────────────────────────────┐
  │             DATABASE LAYER (@ryvix/database)           │
  └───────────────────────┬────────────────────────────────┘
                          ▼
  ┌────────────────────────────────────────────────────────┐
  │                  SUPABASE POSTGRESQL                   │
  │           Auth  │  RLS  │  Tables  │  Audit            │
  └────────────────────────────────────────────────────────┘
```

---

## 3. Subsystem Manifest

- **`packages/database/`**: Shared TypeScript entity definitions, DB client factories with browser execution guards.
- **`backend/`**: Express/Node.js API, deterministic RBAC/ABAC authorization, controlled tool handlers (`handleAIToolGetTaskStatus`), Task & Audit repositories, and Connectors (`gmail.connector.ts`).
- **`ai/`**: Stateless reasoning engine (`orchestrator.ts`). Pure analytical/planning output (`AIPlanOutput`, `PlanStep`). **Zero** database credentials.
- **`web/`**: Next.js 15 App Router interface. Glassmorphic Email OTP login (`web/app/login/page.tsx`), header auth state, SSR cookie middleware (`@supabase/ssr`).
- **`services/`**: Isolated coding workspaces, telemetry stream processor, background workers.
- **`supabase/`**: Authoritative PostgreSQL migrations (`20260921000001_phase1_core_schema.sql`), 6 core tables, 9 RLS policies, automated `set_updated_at` triggers, and `on_auth_user_created` trigger for Email OTP onboarding.

---

## 4. Inflexible Constraints & Memory
1. **Zero Database Credentials in AI**: AI model never receives connection strings, Supabase keys, or SQL capabilities.
2. **Zero Raw Secrets in AI Prompts**: GitHub tokens, Gmail OAuth, and AWS keys live in backend vaults.
3. **No Unrestricted Shells**: AI cannot run arbitrary bash commands; all interactions use whitelisted backend tools.
4. **4-Tier Action Gating**: Level 3 actions (killing processes, restarting production services, hypervisor reboots) require explicit human approval.
5. **Docker Isolation**: Customer code never runs on the Ryvix host; runs in ephemeral unprivileged sandboxes (`UID 1000`, 2 vCPUs, 4GB RAM, 15m timeout).
6. **Supabase Cloud Hosted**: Supabase is hosted at `https://tsoyrpgifovzwqtgpkkb.supabase.co`. Do NOT create a local Postgres container.
7. **Transactional Mail vs Connector Separation**: Supabase Auth handles 6-digit OTP delivery; Gmail connector handles task digests and customer communication.

## Current Implementation Status (Live & Verified)
- **Monorepo Architecture**: `@ryvix/database`, `@ryvix/backend`, `@ryvix/ai`, `@ryvix/services`, `@ryvix/web`.
- **Path 1**: Repository Analyzer (`github.connector.ts`), Docker Sandbox (`docker-workspace.manager.ts`), PR Service (`pr.service.ts`), Web Console (`/tasks`, `/api/tasks`).
- **Path 2**: Internal Agent (`internal-agent.ts`), Cloud Recovery Bridge (`cloud-recovery.bridge.ts`), Server Console (`/servers`, `/api/servers`).
- **Database**: PostgreSQL 17.6 on Supabase (`tsoyrpgifovzwqtgpkkb`). All 35 tables present, 100% RLS enforced.
- **Master Test Runner**: `tests/run-all.ts` running 9 comprehensive test suites (100% pass).
