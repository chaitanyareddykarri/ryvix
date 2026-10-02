# Pre-Migration Audit: Duplicate Implementations Analysis

## Historical checkpoint — 2026-10-02

This report is retained as evidence of its original inspection or test run.
The latest implementation checkpoint is `45b130b`: cloud recovery, WhatsApp P1
dispatch, security email and approved releases are implemented in that checkpoint.
The latest recorded schema is `20261002000003`; provider acceptance is still pending.

See the [current project status](../PROJECT_STATUS.md) for the
implemented scope, migration checkpoint, verification evidence and remaining work.
Results and pending lists below describe the original checkpoint; later changes
are recorded in the status index. Historical counts are intentionally preserved.


This document audits the workspace for duplicate database clients, conflicting abstractions, or redundant type declarations.

---

## 1. Audit Categories & Findings

### 1.1 Supabase Client Implementations
* **Candidate Locations**:
  * `web/utils/supabase/server.ts` & `client.ts` (Next.js SSR layer)
  * `packages/database/src/client.ts` (`createServerDatabaseClient`)
* **Analysis**:
  * `web/utils/supabase/` uses `@supabase/ssr` to read and write auth cookies on incoming HTTP requests. It is scoped to the web browser and Next.js server runtime.
  * `packages/database/` uses `@supabase/supabase-js` without cookies, operating in persistent Node.js background services and backend worker queues with server-side environment variables.
* **Verdict**: **LEGITIMATE & NECESSARY SEPARATION**. Not a duplication.

### 1.2 Type Definitions
* **Candidate Locations**: `packages/database/src/types.ts`
* **Analysis**: All entity types (`Task`, `Project`, `Profile`, `Organization`, `AuditEvent`, `Plan`) are centralized in this single file. No duplicate interface definitions exist in `backend/` or `web/`.
* **Verdict**: **CLEAN**. Zero duplication.

### 1.3 Repositories
* **Candidate Locations**: `backend/src/repositories/`
* **Analysis**: `TaskRepository` and `AuditRepository` are singletons defined exclusively in `backend/src/repositories/`.
* **Verdict**: **CLEAN**. Zero duplication.

### 1.4 Environment Configuration
* **Candidate Locations**: `.env.local` (root) and `web/.env.local`
* **Analysis**: Next.js looks for `.env.local` in the project root or the `web/` directory. Having both ensures CLI scripts in root and Next.js dev servers in `web/` both resolve configuration seamlessly.
* **Verdict**: **ACCEPTABLE**. Both files are strictly ignored by `.gitignore`.
