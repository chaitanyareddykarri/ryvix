# Ryvix Current Project Context

Latest [worker/HTTP/CI follow-up](../docs/verification/WORKER_HTTP_CI_2026_10_07.md) centralizes safe worker pools,
bounds repository inspection and fixes the Linux 320px Tasks overflow.
Testing-branch CI verification precedes main promotion. Missing infrastructure
and provider configuration remain separate external requirements.

## Publication handoff - October 7, 2026

User authorized synchronizing source to `main` and `Testing_branch`. Fresh checks
passed: 97 application suites, 25 Node tests, 186 browser fixtures, typecheck, lint,
production build and secret scan. Approval/preview evidence claims corrected;
sharp updated. Five unpatched development dependency findings and missing
production/provider configuration remain open. Runtime data stays local. See
[pre-publish evidence](../docs/verification/PREPUBLISH_2026_10_07.md) and
[branch workflow](../docs/BRANCH_WORKFLOW.md). Older no-push notes are historical.

## Current handoff - October 7, 2026

The requested UI/backend closures and matching phone/fleet styling are implemented.
Server-only environment creation is implemented using existing tables. Google
login code is ready for provider configuration after deployment. Hosted schema is
applied through `20261007000001`; the CLI reports no pending migrations and
database boundary checks pass. See [current status](../docs/PROJECT_STATUS.md),
[pending queue](../docs/PENDING_WORK.md) and
[migration evidence](../docs/verification/MIGRATIONS_2026_10_07.md).
No commit/push or real-provider activation was performed.

## Historical session log

The dated notes below preserve the sequence of work. Their pending lists and
counts describe their checkpoints; use the current handoff above for next work.


## Hosted migrations applied - October 7, 2026

Applied team invitations (20261006000001) and repository website URLs
(20261007000001) through the Supabase CLI. Post-apply dry run reports no pending
migrations; all database boundary checks passed, including invitation privileges
and the validated website URL constraint. Earlier unapplied notes below are
superseded. Deployed user-flow, server-only concurrency and real-provider
acceptance remain pending. [Rollout evidence](../docs/verification/MIGRATIONS_2026_10_07.md).

Latest UI/fleet review: [evidence](../docs/verification/UI_CONSISTENCY_FLEET_2026_10_07.md).
Session-added UI uses dashboard styling. Fleet errors/reconnection/filters now
behave honestly and Dashboard points to `/dashboard`; brand points to `/`.
The follow-up now implements server-only environment creation inside enrollment,
using current tenant authorization, existing tables and atomic audit. See
[continuation](../docs/verification/SERVER_ONLY_SETUP_2026_10_07.md).

Google login is implemented locally alongside email/password authentication.
The callback checks existing profile/membership and uses the configured production
origin. [Verification](../docs/verification/GOOGLE_LOGIN_2026_10_07.md) and
[provider activation steps](../docs/integrations/GOOGLE_LOGIN.md). Google credentials,
Supabase provider enablement and real identity/session acceptance remain pending.

Latest Part 2: [dashboard evidence and persistence fixes](../docs/verification/DASHBOARD_PART2_2026_10_07.md).
Chat restores saved turns; website URL saving uses a scoped audited API; rejected
diagnosis action and unsupported deployment promises are removed. New URL migration
`20261007000001` remains unapplied, as does team migration `20261006000001`.

Latest October 7: [completed local UI gap implementations](../docs/verification/UI_GAP_CLOSURES_2026_10_07.md).
Server tools, team lifecycle, repository inspection and read-only API-key
authentication now supplement the earlier navigation/phone/deployment repairs.
Team migration `20261006000001` is unapplied. Provider-free checks passed;
actual SQL rollout, deployed authenticated flows and real delivery remain pending.

Historical work: [UI/backend audit and first repair phase](../docs/verification/UI_BACKEND_AUDIT_2026_10_06.md).
Operational destinations are now exposed through dashboard navigation and shared
layouts; deployment observations and audited key revocation are connected.
Server tools, team lifecycle and public API-key authentication remain explicit gaps.

## Active phone onboarding checkpoint - 2026-10-06

General remediation stopped at the user's request; its completed and pending work
is recorded in [local checkpoint](../docs/verification/LOCAL_CHECKPOINT_2026_10_06.md).
Personal profile phone saving, dashboard reminders until supplied, management link
and shared OTP UI are implemented locally. Saving is independent of Meta and never
grants verified identity or consent. See [phone evidence](../docs/verification/PHONE_ONBOARDING_2026_10_06.md).

## Latest follow-up - 2026-10-06

Applied schema: `20261005000004`; all 137 database boundary checks passed.
Coding, repository embeddings and chat reranking record scoped provider attempts.
Production unaccounted model calls fail closed. See
[completion evidence](../docs/verification/ROLLOUT_2026_10_06.md) for actual checks
and remaining deployment, provider, dependency and reviewed-data requirements.

## Latest follow-up - 2026-10-05

Applied schema: `20261005000003`. Server approval handoffs, JS/TS parser references,
streaming attempt accounting, Twilio receipts and optional PagerDuty observations
are implemented. See [evidence](../docs/verification/FOLLOWUP_2026_10_05.md) and
[pending work](../docs/PENDING_WORK.md). Older checkpoints below are historical.

## Historical capability checkpoint — 2026-10-04

Applied schema: `20261004000002`. Gmail authenticated push/reviewed replies, bounded semantic and multi-language reference retrieval, provider-reported usage, Slack/PagerDuty/Twilio P1 dispatch, and external-training dataset preparation are implemented. See [current evidence](../docs/verification/CAPABILITIES_2026_10_04.md), [provider setup](../docs/infrastructure/CAPABILITY_PROVIDERS.md), and [remaining work](../docs/PENDING_WORK.md). Real delivery, deployed browser/worker acceptance, paid fine-tuning adapters and measured model quality remain pending. Older checkpoint sections below are historical.


Active follow-up: [audit remediation queue](../docs/PENDING_WORK.md). The October 3 audit found
legacy AI safety/evidence defects; earlier passing suites are not full live acceptance.

Current code checkpoint: d81b281 (2026-10-03); applied schema 20261003000004.
See [project status](../docs/PROJECT_STATUS.md) and
[assistant verification](../docs/verification/WHATSAPP_ASSISTANT_2026_10_03.md).
WhatsApp OTP, opt-in assistant, confirmed coding, history/quotas and notifications
are implemented. Server/release approvals use authenticated web handoffs. Email
defaults to the user's Gmail SMTP. Experience collection and reviewed lessons are
implemented; representative model quality and live provider delivery are unverified.

## Historical project overview

The following overview includes intended capabilities and old checkpoint counts;
it must not be read as current production certification.

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

## Historical implementation snapshot (superseded)
- **Monorepo Architecture**: `@ryvix/database`, `@ryvix/backend`, `@ryvix/ai`, `@ryvix/services`, `@ryvix/web`.
- **Path 1**: Repository Analyzer (`github.connector.ts`), Docker Sandbox (`docker-workspace.manager.ts`), PR Service (`pr.service.ts`), Web Console (`/tasks`, `/api/tasks`).
- **Path 2**: Internal Agent (`internal-agent.ts`), Cloud Recovery Bridge (`cloud-recovery.bridge.ts`), Server Console (`/servers`, `/api/servers`).
- **Database**: PostgreSQL 17.6 on Supabase (`tsoyrpgifovzwqtgpkkb`). All 35 tables present, 100% RLS enforced.
- **Master Test Runner**: `tests/run-all.ts` running 9 comprehensive test suites (100% pass).

Audit follow-up: production legacy-weight/memory isolation, unseeded topology,
import-aware bounded coding context and opt-in scheduled Gmail polling are implemented.
See [remaining work](../docs/PENDING_WORK.md) for unresolved dependency and live acceptance requirements.
