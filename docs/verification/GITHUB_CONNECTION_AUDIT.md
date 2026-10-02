# Ryvix — Complete GitHub Connection & Non-Coder Website Onboarding Audit

## Historical checkpoint — 2026-10-02

This report is retained as evidence of its original inspection or test run.
The latest implementation checkpoint is `45b130b`: cloud recovery, WhatsApp P1
dispatch, security email and approved releases are implemented in that checkpoint.
The latest recorded schema is `20261002000003`; provider acceptance is still pending.

See the [current project status](../PROJECT_STATUS.md) for the
implemented scope, migration checkpoint, verification evidence and remaining work.
Results and pending lists below describe the original checkpoint; later changes
are recorded in the status index. Historical counts are intentionally preserved.


**Date**: September 24, 2026  
**Auditor**: Ryvix Architecture & Verification Suite  
**Scope**: `web/`, `backend/`, `ai/`, `services/`, `packages/database/`, `supabase/`, `tests/`, `docs/`  
**Target User Persona**: Non-Coder / Business Owner (Zero knowledge of Git, branches, Docker, CI/CD, SSH, or tokens)

---

## 1. Executive Summary

Ryvix's backend and AI cognitive layers contain production-grade implementations of GitHub App JWT authentication, PR generation, Docker ephemeral workspace sandbox provisioning, and multi-domain customer health query handling.

However, the **onboarding and repository connection experience was originally built with a developer-centric mindset**:
1. The connection UI exposed technical concepts (Personal Access Tokens, GitHub App Client Secrets, OAuth scopes, branches, protected branch flags).
2. Connecting a repository in the database inserted hardcoded default values (`ARRAY['nextjs', 'typescript']`) rather than executing **real-time automatic repository inspection**.
3. The multi-step non-coder onboarding flow (Connect GitHub -> Choose website -> Automatic repository analysis progress -> Technology & deployment detection -> Clean summary -> Optional server monitoring) lacked an integrated, guided wizard.

This audit establishes the ground truth of every requirement across the system before implementation.

---

## 2. Requirement Status Classification Matrix

* **A**: Already fully implemented (Verified in active code path)
* **B**: Partially implemented (Core logic exists, needs refinement or non-coder simplification)
* **C**: UI exists but backend is missing
* **D**: Backend exists but UI/API integration is missing
* **E**: Database exists but application integration is missing
* **F**: Only documentation/specification exists
* **G**: Completely missing

---

## 3. Comprehensive Feature Audit Table

| # | Feature / Requirement | Current Implementation | Status | Files | Missing Work | Security Concerns |
|---|---|---|---|---|---|---|
| **1** | **Non-Coder Onboarding UX (Screen Flow)** | Fragmented modals (`ConnectRepositoryModal.tsx`, `ConnectServerModal.tsx`) within dashboard tabs. | **B** | `web/components/ConnectRepositoryModal.tsx`, `web/app/dashboard/page.tsx` | Build unified, step-by-step non-coder wizard: Connect GitHub -> Choose Website -> Analyzing -> Connected Summary -> Optional Server. | Zero credential exposure; prevent accidental leak of developer config. |
| **2** | **Screen 1: Simple GitHub Connect** | Shows technical explanation, OAuth vs PAT tabs, Client ID/Secret copy-paste guide. | **B** | `web/components/ConnectRepositoryModal.tsx` | Simplify to "Connect your website" with single [Connect GitHub] primary action. Keep PAT only as an unstyled subtle emergency fallback. | Remove technical setup guides from normal customer UI. |
| **3** | **GitHub Authorization (OAuth / App)** | Implemented via OAuth callback exchanging code for token, storing in `gh_session_token` HTTP-only cookie, upserting `repository_installations`. App JWT logic exists in `github.connector.ts`. | **A** | `web/app/api/auth/github/authorize/route.ts`, `web/app/api/auth/github/callback/route.ts`, `backend/src/connectors/github.connector.ts` | None on backend. UI needs to invoke it cleanly without exposing scopes. | Token stored in `httpOnly: true`, `SameSite: Lax` cookie. Never exposed to browser JS or AI models. |
| **4** | **Hide GitHub Complexity** | Installation ID, scopes, and branch names were partially exposed in modals. | **B** | `web/components/ConnectRepositoryModal.tsx` | Eliminate branch dropdown for non-coders; default automatically to `default_branch` (`main`). Hide raw IDs and permissions. | Ensure backend resolves necessary internal IDs securely without client intervention. |
| **5** | **Repository Selection ("Choose your website")** | Lists repos from `/api/github/repositories` (`https://api.github.com/user/repos`), supports name search. | **B** | `web/components/ConnectRepositoryModal.tsx`, `web/app/api/github/repositories/route.ts` | Replace developer list with simple website cards showing website name and language tag. Single click to proceed to analysis. | Verify user only sees repositories granted to their authenticated GitHub token. |
| **6** | **Automatic Repository Analysis** | `RepositoryAnalyzer.detectStack` and `codingAssistant.detectStackFromManifest` exist in backend/ai, but NO API route invoked them on connect. `/api/github/repositories/connect` hardcoded `['nextjs', 'typescript']`. | **D** | `backend/src/connectors/github.connector.ts`, `ai/src/coding-assistant.ts`, `web/app/api/github/repositories/connect/route.ts` | 1) Create `/api/github/repositories/analyze` endpoint calling GitHub Git Tree API.<br>2) Inspect manifests (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`).<br>3) Build animated progress UI in wizard. | Sanitize repo paths; restrict tree recursion depth to prevent denial-of-service on huge monorepos. |
| **7** | **Deployment Detection** | `RepositoryAnalyzer` only checked for `Dockerfile`. No inspection of `.github/workflows/`, `vercel.json`, `netlify.toml`, or AWS configs. | **B** | `backend/src/connectors/github.connector.ts` | Expand analyzer to inspect `.github/workflows/*.yml`, `vercel.json`, Netlify, Docker. Return `deploymentDetected: boolean` and `deploymentProvider`. | Read-only inspection of workflow manifests; do not execute arbitrary CI scripts. |
| **8** | **Website Connected Result Screen** | Missing. Modal simply closed and set `selectedWebsite` on dashboard. | **G** | `web/components/ConnectRepositoryModal.tsx`, `web/app/dashboard/page.tsx` | Build clean summary screen: "Your website is connected ✓", showing Repo Name, Detected Tech, Deployment Status, GitHub: Connected, and [Open Workspace]. | Do not expose internal database UUIDs or clone URLs with embedded tokens. |
| **9** | **Separation of GitHub and Server Concepts** | Architecture (`ADR-004`), DB (`repositories` vs `servers`), and API routes (`/api/github/*` vs `/api/servers`) are completely separate. | **A** | `packages/database/src/types.ts`, `web/app/api/servers/route.ts`, `web/app/api/github/repositories/route.ts` | Clearly explain to non-coders that GitHub gives source code understanding, while server connection adds live CPU/RAM monitoring. | Server credentials and GitHub credentials must never be intermixed or co-located. |
| **10** | **Connector Installation Flow** | `ConnectServerModal.tsx` provides 1-line curl enrollment token with outbound polling and auto-detection. Bounded capabilities only. | **A** | `web/components/ConnectServerModal.tsx`, `web/app/api/servers/route.ts`, `backend/src/connectors/server-inband.agent.ts` | Wire as an optional "Next: Connect Your Server" step in the onboarding flow. | Outbound HTTPS only (no inbound open ports); enrollment token expires in 24 hours; no arbitrary shell command execution. |
| **11** | **AI Permission Boundary (No Direct Control)** | AI generates structured plans (`PlanStep`) and diagnostics. Changes require backend validation and human approval for high-blast-radius actions. | **A** | `ai/src/orchestrator.ts`, `web/app/api/tasks/route.ts`, `docs/decisions/ADR-006-AI-PERMISSION-BOUNDARY.md` | Document data flow and maintain strict validation in all tools. | AI never receives GitHub PAT, App private key, Supabase service role key, or server SSH credentials. |
| **12** | **Isolated Coding Workspace** | `DockerWorkspaceManager` provisions ephemeral Docker sandbox with 2 vCPUs, 2048MB RAM, 15m timeout, ephemeral ports 3100-3999. | **A** | `services/src/workspace/docker-workspace.manager.ts`, `web/app/api/workspace/route.ts` | Link detected stack profile (Node.js, Next.js, Python, Go) dynamically into workspace container base image. | Container runs as non-root; production host filesystem is never mounted; cgroup ceilings strictly enforced. |
| **13** | **Branch / Pull Request Model** | `PullRequestService` creates atomic branches (`ryvix/task-...`) and opens PRs via GitHub API. Direct push to `main` is disallowed. | **A** | `backend/src/services/pr.service.ts`, `backend/src/connectors/github.connector.ts` | Display PR link clearly in user dashboard/chat when changes are finalized. | Direct pushes to `main` prevented; commits signed with bot identity `ryvix-bot[bot]`. |
| **14** | **Secrets & Environment Variables Protection** | `.env.local` is gitignored. Secret threat classifiers exist. But repository scanner didn't explicitly check for accidentally committed `.env` files. | **B** | `backend/src/connectors/github.connector.ts`, `ai/src/security/threat-neural-engine.ts` | Add secret scanning during repo analysis that flags committed `.env` or `.pem` files as "Potential secret detected" without revealing values. | NEVER log secret values, print them to UI, or feed them to LLM prompt context. |
| **15** | **Deployment Verification & Self-Healing** | `SelfHealingPipeline` implements multi-step health checks, incident lifecycle, and a 3-attempt circuit breaker before escalating to user. | **A** | `services/src/healing/self-healing.pipeline.ts`, `ai/src/customer-health-query-agent.ts` | Surface healing status in plain English in the chat console. | Circuit breaker prevents infinite crash-looping or repeated service restarts. |
| **16** | **Non-Coder Chat Experience** | `CustomerHealthQueryAgent` handles natural language queries ("My website is down", "Why is my website slow?", "Is my server healthy?"). | **A** | `ai/src/customer-health-query-agent.ts`, `web/app/api/chat/route.ts` | Feed connected website and repository metadata into conversation context for personalized responses. | Guardrails reject out-of-scope queries; action commands require operator approval. |
| **17** | **Database Architecture & Multi-Tenancy** | PostgreSQL schema has `organizations`, `projects`, `repositories`, `repository_installations`, `pull_requests`, `servers`, `connectors`, `audit_events`. Multi-tenant isolation verified. | **A** | `packages/database/src/types.ts`, `supabase/migrations/20260921000002_complete_platform_schema.sql` | Store real detected stack and deployment provider in `repositories` row upon connection. | RLS policies enforce tenant boundaries on all queries. |
| **18** | **Audit Trail** | `audit_events` table logs `project_id`, `actor_id`, `action_name`, `parameters_hash`, `diff_summary`, and timestamps. | **A** | `web/app/api/github/repositories/connect/route.ts`, `packages/database/src/types.ts` | Emit audit event for repository analysis and deployment detection. | Parameters are SHA-256 hashed; sensitive tokens are excluded from audit records. |
| **19** | **User-Friendly Error Handling** | API routes returned JSON error messages; some technical errors leaked to UI. | **B** | `web/components/ConnectRepositoryModal.tsx`, `web/app/api/auth/github/callback/route.ts` | Map GitHub errors (401, 403, 404, 429) to clean non-technical guidance. | Raw stack traces or database error details must never be exposed to users. |
| **20** | **Security & Credential Boundaries** | Tokens are server-side only in HTTP-only cookies; Supabase client uses anon key; AI has no secret access. | **A** | `web/utils/supabase/server.ts`, `web/app/api/auth/github/callback/route.ts` | Audit every new endpoint to ensure no token leakage. | Maintain `httpOnly: true`, `SameSite: Lax` on all auth cookies. |

---

## 4. Key Gaps Requiring Implementation

Based on this audit, three targeted enhancements are required to complete the non-coder onboarding experience:

1. **Real-Time Repository Analysis Engine (`/api/github/repositories/analyze`)**:
   - Query GitHub Git Trees API for the selected repository.
   - Detect framework (Next.js, React, Vue, FastAPI, Express, Django, Go, Rust).
   - Detect deployment systems (GitHub Actions workflows, Vercel config, Dockerfile, etc.).
   - Scan for committed secrets/`.env` files safely and flag them without revealing content.
   - Return structured analysis to replace the hardcoded `ARRAY['nextjs', 'typescript']`.

2. **Step-by-Step Non-Coder Onboarding Wizard (`web/components/ConnectRepositoryModal.tsx`)**:
   - **Step 1: Connect Website**: Simple explanation with prominent [Connect GitHub] button.
   - **Step 2: Choose Website**: Clean website cards with search bar (hiding branches, installation IDs, and scopes).
   - **Step 3: Automatic Inspection**: Live progress bar showing real inspection steps.
   - **Step 4: Website Connected**: Confirmation card showing repository, technology, deployment status, and [Open Workspace].
   - **Step 5: Optional Server Connect**: Friendly prompt offering optional server monitoring.

3. **Context-Enriched Non-Coder Chat Experience**:
   - Inject the newly connected website and repository stack into `CustomerHealthQueryAgent` so that natural language queries ("Is my website healthy?", "What technology does my site use?") provide instantaneous, accurate answers without hallucinations.
