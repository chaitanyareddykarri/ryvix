# AI Agent Guidelines & Operating Instructions for Ryvix

## 1. What Ryvix Is

Ryvix is an AI-powered autonomous software and infrastructure operations platform. Customers connect their GitHub repositories, communication channels (Web Chat, WhatsApp, Gmail), running applications, and infrastructure servers. 
Ryvix analyzes project codebases, provisions isolated coding environments, performs stack-aware code modifications, generates frontend previews, verifies builds and tests, streams real-time telemetry (logs, metrics, processes), detects security anomalies, and triggers authorized server operations and recoveries.

---

## 2. Mandatory Instructions for AI Agents

As an AI agent working in this repository, you must adhere to these operational directives:

### Mandatory Reading Before Implementation
Before touching code or creating new files, you **MUST** read:
1. [`.ai/CONTEXT.md`](./CONTEXT.md) — The current state and active implementation phase.
2. [`.ai/RULES.md`](./RULES.md) — Inflexible engineering and safety constraints.
3. [`.ai/ARCHITECTURE.md`](./ARCHITECTURE.md) — High-level architecture map.
4. [`.ai/SECURITY.md`](./SECURITY.md) — Security, permissions, and credential boundaries.
5. The specific specification in `docs/` relevant to your task.

### How to Navigate the Repository
- **Architecture & System Design**: Always consult `docs/architecture/` before proposing structural alterations.
- **Product & Feature Requirements**: Consult `docs/product/` for behavior, customer UX, and flows.
- **Integration Contracts**: Consult `docs/integrations/` when interacting with GitHub, Supabase, Hugging Face, WhatsApp, Gmail, or server connectors.
- **Database Schema & Migrations**: Refer to `docs/database/` and `supabase/migrations/`.
- **Architectural Decisions**: Read `docs/decisions/` before suggesting alternative approaches.

---

## 3. Strict Architectural Boundaries

1. **AI Model vs. Backend Orchestrator**:
   - The AI Model (LLM / Hugging Face) is an **intelligence engine only**. It reasons, plans, generates diffs, analyzes logs, and explains incidents.
   - The AI Model is **NOT** the database, the authenticator, the permission checker, or the server executor.
   - The AI Model must **NEVER** receive raw infrastructure credentials, raw GitHub private keys, or direct SSH shells.
   - All tool invocations must route through the Ryvix Backend for policy check, permission validation, approval evaluation, and immutable audit recording.

2. **Internal vs. External Connector**:
   - **Internal Connector**: Runs inside the customer environment. Collects application/system logs, metrics, container states, and runs pre-approved internal operations.
   - **External Connector (Out-of-Band)**: Runs outside the customer environment. Checks reachability independently and triggers cloud provider recovery (reboots/power resets) when the internal server crashes.
   - Never collapse these two into a single path.

3. **Supabase as Application Foundation**:
   - Supabase provides Auth, PostgreSQL, Realtime, and Storage.
   - Heavy background workloads (coding workspaces, telemetry processing, AI orchestration) belong in **Ryvix Workers/Services**, not inside edge functions or database triggers.

4. **Preserve Customer CI/CD**:
   - Ryvix does not overwrite or replace customer deployment pipelines unless explicitly asked. Authorized changes are committed or opened as PRs to GitHub; the customer's existing CI/CD performs build and deploy, after which Ryvix verifies runtime health.

---

## 4. What Must NEVER Be Changed Casually

- **Database Schemas**: Never alter production columns, foreign keys, or RLS policies without an ADR and an incremental numbered migration in `supabase/migrations/`.
- **Security & Permission Model**: Never loosen permission checks, bypass backend tool authorization, or allow raw bash execution on customer servers.
- **Audit Logging**: Never add an operational or code modification action that bypasses the `audit_events` logging pipeline.
- **API Contracts**: Maintain strict backward compatibility for all connector agent payloads and Web Chat streaming events.

---

## 5. Agent Workflow for Feature Implementation

When tasked with implementing a feature in a scheduled phase:
1. Check [`.ai/CURRENT_TASK.md`](./CURRENT_TASK.md).
2. Validate against relevant ADRs in `docs/decisions/`.
3. Create necessary tests first (unit/integration) under `tests/`.
4. Implement types and schemas in `packages/` or target services.
5. Write the implementation code in `backend/`, `web/`, `services/`, or `supabase/`.
6. Verify locally without committing secrets or stubbed mocks that misrepresent completeness.
7. Update documentation and [`.ai/CURRENT_TASK.md`](./CURRENT_TASK.md).
