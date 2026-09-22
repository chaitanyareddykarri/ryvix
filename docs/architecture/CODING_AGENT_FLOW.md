# Ryvix Autonomous AI Coding & PR Lifecycle Workflow Specification

## 1. End-to-End Autonomous Coding Loop

This document details the 12-stage lifecycle when a user asks Ryvix to implement a feature, fix a bug, or modernize an existing software project.

```
[ 1. User Natural Language Input ]
  e.g., "make my website look better and put something nice at the top"
       │
       ▼
[ 2. Requirement Understanding & Intent Processing ] (ai/src/understanding/)
  - Classifies Intent: `IMPROVE_UX`
  - Identifies Target: `Homepage Hero Section (app/page.tsx or components/Hero.tsx)`
  - Formulates Constraints: Preserve Auth (Supabase), preserve design tokens, no extra dependencies
  - Checks for Ambiguity: If vague (e.g. "fix it"), halts and requests clarification
       │
       ▼
[ 3. Context Assembly & Secret Sanitization ] (ai/src/context/)
  - Ingests target files (top 1–5 files, e.g. `app/page.tsx`, `components/Hero.tsx`, `globals.css`)
  - Scopes allowed tools & platform policies
  - Automatically strips & redacts secrets (passwords, tokens, private keys, connection strings)
       │
       ▼
[ 4. LLM Gateway & Technical Plan Synthesis ] (ai/src/llm/ & ai/src/planning/)
  - Multi-tier provider chain (Groq, Hugging Face Qwen 2.5 Coder, Gemini, Ollama, Local Fallback)
  - Emits structured JSON adhering to `@ryvix/database` `Plan` & `PlanStep` schema (10-step sequence)
       │
       ▼
[ 5. Plan Validation & Tool Authorization Gate ] (ai/src/validation/)
  - Validates schema, step numbering, and dependency DAG
  - Verifies tool authorization (blocks dangerous tools e.g. `system.rm_rf`)
  - Checks tenant boundaries & blast-radius risk
  - Enforces `requires_approval = true` on all code diffs, file modifications, and deployments
       │
       ▼
[ 6. Ephemeral Docker Sandbox Provisioning ] (services/src/workspace/)
  - Dynamic stack detection (Node/Next.js, Python, Go, Rust, Docker)
  - Allocates container `ryvix_sbx_<hash>` on isolated bridge (0.5 vCPU, 512MB RAM cap)
  - Assigns dynamic host preview port in range `3100–3999`
       │
       ▼
[ 7. In-Sandbox Code Modification & Diffs ]
  - Applies synthesized AST / unified git diff to target files
       │
       ▼
[ 8. In-Sandbox Build & Verification ]
  - Runs typecheck (`tsc --noEmit`) and build (`npm run build`)
  - Runs regression test suite (`npm test`)
  - Autonomous Self-Debugging: If compiler fails, error logs feed back to AI for auto-repair
       │
       ▼
[ 9. Live Frontend Preview & Unified Diff Tab ]
  - Spins up preview server inside container
  - Exposes interactive iframe in Web Chat with Desktop, Tablet, and Mobile toggles
  - Displays syntax-highlighted additions (+) and deletions (-) in Diff Tab
       │
       ▼
[ 10. Human Action Review & Approval Card ]
  - Action Approval Card rendered in Web Chat
  - User reviews preview and diff, clicks: [Approve & Create PR] or [Reject]
       │
       ▼
[ 11. Atomic Git Branch, Commit & GitHub PR ] (backend/src/services/pr.service.ts)
  - Creates atomic branch `ryvix/ai-<slug>`
  - Commits signed changes via GitHub App
  - Opens Pull Request with full test logs and change summary
       │
       ▼
[ 12. Model-Readiness Data Collection & Teardown ] (ai/src/evaluation/)
  - Ephemeral sandbox container destroyed; preview port released
  - Sanitized execution trajectory logged for evaluation benchmarks and future fine-tuning
```

## 2. Multi-Language Support Matrix

The Coding Workspace dynamically detects repository profiles and deploys appropriate base containers:
- **Next.js / React (TypeScript/JavaScript)**: `node:20-alpine`, port 3000, `npm run build`, `npm test`
- **Python (FastAPI / Flask / Django)**: `python:3.11-slim`, port 8000, `pytest`
- **Go (Golang)**: `golang:1.22-alpine`, port 8080, `go test ./...`
- **Rust**: `rust:1.80-slim`, port 8080, `cargo test`
- **Containerized**: `docker:dind`, port 8080
