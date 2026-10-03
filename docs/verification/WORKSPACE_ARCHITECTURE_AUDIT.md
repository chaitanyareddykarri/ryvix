# Ryvix Workspace Architecture Audit

## Historical report — current reference updated 2026-10-03

The original findings, counts and pending lists below remain historical evidence.
Current code is `d81b281`, schema `20261003000004`; see
[project status](../PROJECT_STATUS.md) and [latest verification](WHATSAPP_ASSISTANT_2026_10_03.md).
Do not interpret older missing-feature lists as current or fixture passes as real
provider/browser certification. No historical test result was changed or rerun
by this documentation update.


**Date**: September 23, 2026  
**Status**: AUDITED & COMPLIANT  

## 1. Monorepo Structure & Package Boundaries

Ryvix is structured as an npm workspaces monorepo:

```
ryvix-monorepo/
├── packages/
│   └── database/        # Shared typed Supabase client, models, and TypeScript types
├── web/                 # Next.js 15 App Router web console and user-facing API routes
├── backend/             # Core service controllers, Octokit GitHub connector, PR service
├── ai/                  # Local threat classification, RAG vector store, AGI cognitive loop
└── services/            # Internal agent daemon, external monitor, Docker workspace sandbox
```

---

## 2. Dependency Flow & Invariant Enforcement

1. **Database Isolation (`packages/database`)**:
   - Single source of truth for TypeScript types mapped to PostgreSQL schema.
   - Consumed by `backend`, `ai`, `services`, and `web`.
   - Never directly writes arbitrary schemas without migrations.

2. **Web Isolation (`web`)**:
   - Handles HTTP routing, session cookie management, SSR rendering, and UI modals.
   - Imports `@ryvix/database`, `@ryvix/ai`, and `@ryvix/services` through workspace symlinks.
   - Employs Next.js Server Actions and Route Handlers to prevent client-side credential leakage.

3. **Backend & Services Isolation (`backend` & `services`)**:
   - `services/src/connector/internal-agent.ts`: Runs zero-trust capability whitelisting. Cannot execute unapproved shell scripts.
   - `services/src/monitoring/external-monitor.ts`: Completely decoupled from in-host agent to guarantee unbiased outage detection.

4. **AI Isolation (`ai`)**:
   - AI outputs structured diagnosis and plans.
   - Does NOT possess direct database write permissions or raw cloud hypervisor access.
   - Permitted actions must pass through deterministic backend validation before dispatch to `connector_commands`.
