# Pre-Migration Repository Issues Audit

This document catalogs every issue and defect identified during the full repository health check prior to database migration.

---

## Issue Summary Matrix

| Category | Count | Status |
| :--- | :--- | :--- |
| **BUILD / TYPE** | 8 | Actionable / In Progress |
| **CONFIGURATION / WORKSPACE** | 4 | Actionable / In Progress |
| **DATABASE & SCHEMA** | 3 | Actionable / In Progress |
| **TOTAL IDENTIFIED** | **15** | |

---

## Detailed Issue Registry

### [ISSUE-01] BUILD / TYPE: Missing root monorepo `package.json`
* **Severity**: ERROR
* **Subsystem**: root
* **File**: `package.json`
* **Line**: 1
* **Problem**: No root `package.json` exists to manage and coordinate sub-packages (`packages/database`, `web`, `backend`, `ai`, `services`).
* **Root Cause**: Repository initialized without a top-level workspace definition.
* **Required Fix**: Create root `package.json` with `workspaces: ["packages/*", "web", "backend", "ai", "services"]`.
* **Status**: Open

---

### [ISSUE-02] BUILD / TYPE: Missing root `tsconfig.base.json` & `tsconfig.json`
* **Severity**: ERROR
* **Subsystem**: root
* **File**: `tsconfig.json`
* **Line**: 1
* **Problem**: Sub-packages cannot inherit shared TypeScript compiler settings or path mappings.
* **Root Cause**: Missing base TypeScript configuration.
* **Required Fix**: Create `tsconfig.base.json` and root `tsconfig.json` with strict mode and project references.
* **Status**: Open

---

### [ISSUE-03] CONFIGURATION: Missing `backend/package.json`
* **Severity**: ERROR
* **Subsystem**: backend
* **File**: `backend/package.json`
* **Line**: 1
* **Problem**: `backend/` contains TypeScript source code but has no `package.json` declaring its package name (`@ryvix/backend`) or dependencies.
* **Root Cause**: Backend files created without workspace package manifest.
* **Required Fix**: Create `backend/package.json` declaring dependencies on `@ryvix/database` and `@supabase/supabase-js`.
* **Status**: Open

---

### [ISSUE-04] CONFIGURATION: Missing `backend/tsconfig.json`
* **Severity**: ERROR
* **Subsystem**: backend
* **File**: `backend/tsconfig.json`
* **Line**: 1
* **Problem**: TypeScript compiler cannot resolve backend paths or build outputs without dedicated configuration.
* **Root Cause**: Missing compiler options for `backend/`.
* **Required Fix**: Add `backend/tsconfig.json` extending root base config.
* **Status**: Open

---

### [ISSUE-05] CONFIGURATION: Missing `ai/package.json`
* **Severity**: ERROR
* **Subsystem**: ai
* **File**: `ai/package.json`
* **Line**: 1
* **Problem**: `ai/` contains source code but lacks a package manifest (`@ryvix/ai`).
* **Root Cause**: AI files created without package manifest.
* **Required Fix**: Create `ai/package.json` with workspace metadata.
* **Status**: Open

---

### [ISSUE-06] CONFIGURATION: Missing `ai/tsconfig.json`
* **Severity**: ERROR
* **Subsystem**: ai
* **File**: `ai/tsconfig.json`
* **Line**: 1
* **Problem**: `ai/` lacks TypeScript compiler settings.
* **Root Cause**: Missing compiler options for `ai/`.
* **Required Fix**: Add `ai/tsconfig.json` extending base configuration.
* **Status**: Open

---

### [ISSUE-07] ARCHITECTURAL: Brittle relative imports in `backend/`
* **Severity**: WARNING
* **Subsystem**: backend
* **File**: `backend/src/db.ts` & `backend/src/repositories/*.ts`
* **Line**: Multiple
* **Problem**: Backend files use `../../packages/database/src/client` and `../../../packages/database/src/types` rather than importing `@ryvix/database`.
* **Root Cause**: Absence of workspace package resolution.
* **Required Fix**: Refactor imports to `@ryvix/database` via workspace linking or tsconfig paths.
* **Status**: Open

---

### [ISSUE-08] DEPENDENCY: `web/package.json` missing `@ryvix/database` dependency
* **Severity**: WARNING
* **Subsystem**: web
* **File**: `web/package.json`
* **Line**: 15
* **Problem**: `web/` does not declare a dependency on the shared `@ryvix/database` package.
* **Root Cause**: Package manifests not linked across workspaces.
* **Required Fix**: Add `"@ryvix/database": "workspace:*"` to `web/package.json`.
* **Status**: Open

---

### [ISSUE-09] TYPE: Unresolved `@supabase/ssr` in `web/`
* **Severity**: ERROR
* **Subsystem**: web
* **File**: `web/utils/supabase/server.ts`, `client.ts`, `middleware.ts`
* **Line**: 1
* **Problem**: TypeScript Language Server reports `Cannot find module '@supabase/ssr'`.
* **Root Cause**: `node_modules` not populated due to initial network interruption during install.
* **Required Fix**: Install workspace dependencies and link node_modules.
* **Status**: Open

---

### [ISSUE-10] TYPE: Unresolved `@supabase/supabase-js` in `packages/database` & `backend`
* **Severity**: ERROR
* **Subsystem**: packages/database
* **File**: `packages/database/src/client.ts`
* **Line**: 1
* **Problem**: TypeScript Language Server reports `Cannot find module '@supabase/supabase-js'`.
* **Root Cause**: `packages/database` lacks populated `node_modules`.
* **Required Fix**: Install dependencies via root workspace install.
* **Status**: Open

---

### [ISSUE-11] TYPE: Unresolved `next` and `next/headers`, `next/server` in `web/`
* **Severity**: ERROR
* **Subsystem**: web
* **File**: `web/app/layout.tsx`, `web/app/page.tsx`, `web/middleware.ts`
* **Line**: 1
* **Problem**: TypeScript Language Server reports `Cannot find module 'next'`.
* **Root Cause**: `web/node_modules` not populated.
* **Required Fix**: Install dependencies via root workspace install.
* **Status**: Open

---

### [ISSUE-12] TYPE: Missing `@types/node` definitions in `backend/` and `ai/`
* **Severity**: WARNING
* **Subsystem**: backend, ai
* **File**: `backend/src/db.ts`
* **Line**: 21
* **Problem**: `process.env` references untyped without `@types/node`.
* **Root Cause**: Dev dependencies not declared in subsystem package.json.
* **Required Fix**: Add `@types/node` to devDependencies.
* **Status**: Open

---

### [ISSUE-13] DATABASE: Missing foreign key performance indexes in Phase 1 migration
* **Severity**: WARNING
* **Subsystem**: supabase
* **File**: `supabase/migrations/20260921000001_phase1_core_schema.sql`
* **Line**: 60-120
* **Problem**: Foreign key columns (`tasks.project_id`, `tasks.created_by`, `plans.task_id`, `audit_events.project_id`, `audit_events.timestamp`) have no indexes.
* **Root Cause**: Initial DDL created tables and constraints without indexing lookup columns.
* **Required Fix**: Add `CREATE INDEX IF NOT EXISTS idx_...` for all tenant foreign keys and timestamp ordering columns.
* **Status**: Open

---

### [ISSUE-14] DATABASE: Missing automatic `updated_at` trigger in Phase 1 migration
* **Severity**: WARNING
* **Subsystem**: supabase
* **File**: `supabase/migrations/20260921000001_phase1_core_schema.sql`
* **Line**: 125
* **Problem**: `organizations`, `profiles`, `projects`, and `tasks` define `updated_at TIMESTAMPTZ` but have no trigger to automatically update the timestamp on `UPDATE`.
* **Root Cause**: Absence of a PostgreSQL trigger function (`set_updated_at()`).
* **Required Fix**: Add `set_updated_at()` trigger function and attach triggers to all tables with `updated_at`.
* **Status**: Open

---

### [ISSUE-15] SCHEMA/CODE: Step schema discrepancy between `Plan` type and `AIPlanOutput`
* **Severity**: WARNING
* **Subsystem**: ai / database
* **File**: `packages/database/src/types.ts` & `ai/src/orchestrator.ts`
* **Line**: Multiple
* **Problem**: `Plan.steps` in `types.ts` defines `step_number`, `status: 'pending'|...`, whereas `AIPlanOutput` in `ai/src/orchestrator.ts` defines `stepNumber`, `suggestedTool` without matching naming convention.
* **Root Cause**: Schema naming divergence between snake_case database JSON and camelCase AI output.
* **Required Fix**: Harmonize naming conventions and document step serialization in `types.ts`.
* **Status**: Open
