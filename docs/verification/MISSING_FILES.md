# Pre-Migration Audit: Missing Files Analysis

This document identifies files and configurations that are genuinely required by the Ryvix architecture but are currently absent from the workspace.

---

## 1. Genuinely Required Files (Phase 0 / Phase 1 Prerequisite)

| Path | Subsystem | Why It Is Required | Phase | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| `package.json` | Root | Coordinates monorepo workspaces (`packages/*`, `web`, `backend`, `ai`, `services`). | Phase 0 | **Create immediately** with npm workspaces. |
| `tsconfig.base.json` | Root | Centralizes compiler options (`strict`, `moduleResolution: "bundler"`, paths). | Phase 0 | **Create immediately**. |
| `tsconfig.json` | Root | Configures project references for VS Code and language server. | Phase 0 | **Create immediately**. |
| `backend/package.json` | Backend | Declares `@ryvix/backend` package, dependencies (`@ryvix/database`, `@supabase/supabase-js`). | Phase 0 | **Create immediately**. |
| `backend/tsconfig.json` | Backend | TypeScript configuration for compiling backend services and repositories. | Phase 0 | **Create immediately**. |
| `ai/package.json` | AI | Declares `@ryvix/ai` package manifest and shared dependencies. | Phase 0 | **Create immediately**. |
| `ai/tsconfig.json` | AI | TypeScript configuration for compiling AI reasoning and planning modules. | Phase 0 | **Create immediately**. |
| `services/package.json` | Services | Declares `@ryvix/services` for telemetry processors and workspace runners. | Phase 1-2 | Schedule for Phase 2 when worker jobs are implemented. |

---

## 2. Future-Phase Files (Correctly Scheduled, Not Missing Now)

The following files are defined in architecture specifications but belong to future implementation phases. They are **NOT** considered defects for Phase 0/1:

- `supabase/migrations/20260921000002_github_and_repos.sql`: Scheduled for Phase 3 (GitHub).
- `supabase/migrations/20260921000003_ai_and_workspaces.sql`: Scheduled for Phase 4-5 (Workspaces).
- `services/connector/agent/`: In-host connector daemon, scheduled for Phase 6.
- `services/communication/whatsapp/`: WhatsApp webhook handler, scheduled for Phase 9.
- `services/communication/gmail/`: Gmail notification handler, scheduled for Phase 9.
