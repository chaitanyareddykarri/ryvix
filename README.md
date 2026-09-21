# Ryvix — Autonomous Software & Infrastructure Operations Platform

> **Status**: Architecture Foundation & Initial Scaffolding (Phase 0)  
> **Source of Truth**: [Ryvix_Final_Complete_Project_Architecture.docx](./Ryvix_Final_Complete_Project_Architecture.docx) and `docs/architecture/`

---

## 1. Overview

**Ryvix** is an AI-powered autonomous software and infrastructure operations platform. A customer connects an existing software project, GitHub repository, deployed application, and authorized infrastructure. Ryvix:
1. **Analyzes** the project and its running environment, detecting technology stacks, frameworks, build systems, and runtime characteristics.
2. **Establishes** and manages controlled dual-path connector relationships (Internal agent daemon + Out-of-Band external recovery controller).
3. **Enables Communication** through Web Chat, WhatsApp, and Gmail for commands, status inquiries, alerts, and incident responses.
4. **Modifies & Verifies Software** autonomously via stack-aware ephemeral coding workspaces or direct repository workflows, generating frontend previews and verifying deployments through customer CI/CD.
5. **Monitors & Secures** systems by streaming logs, metrics, OS health, process trees, and container states, pairing deterministic anomaly detection with AI investigations and human-in-the-loop approvals.

---

## 2. Core Architectural Separation

Ryvix strictly enforces clean architectural and security boundaries:

```
                         CUSTOMER
                            │
             ┌──────────────┼──────────────┐
             │              │              │
           WEB          WHATSAPP         GMAIL
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                     RYVIX BACKEND
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
          SUPABASE                  RYVIX WORKERS
              │                           │
       ┌──────┼───────┐          ┌───────┼────────┐
       │      │       │          │       │        │
      Auth  Postgres Realtime   AI jobs  Coding  Connector
       │      │       │          │      jobs    jobs
       └──────┼───────┘          │       │        │
              │                  ▼       ▼        ▼
              │             HUGGING   WORKSPACE  CUSTOMER
              │             FACE AI              SYSTEMS
              │                                  │
              │                          ┌───────┴───────┐
              │                          │               │
              │                     Internal        External
              │                     Connector       Control Path
              │                          │               │
              │                          └───────┬───────┘
              │                                  │
              └────────────── RYVIX DATA / AUDIT ┘
```

### Key Boundaries:
* **AI Model (Hugging Face / LLM Gateway)**: Intelligence and reasoning layer only. Generates plans, diffs, tool selections, and investigation explanations. **NEVER** holds credentials or bypasses backend authorization.
* **Ryvix Backend / Orchestrator**: Control and enforcement layer. Validates permissions, orchestrates tasks, dispatches tool calls, checks human approvals, and records immutable audit events.
* **Supabase**: Managed foundation providing Auth, PostgreSQL database, Realtime event propagation, Storage, and Row-Level Security (RLS).
* **Dual-Path Connectors**:
  * **Internal Connector**: Runs inside customer server; streams rich telemetry (logs, CPU/RAM/disk, processes, containers) and runs approved commands.
  * **External Connector (Out-of-Band)**: Independent cloud/infrastructure control path outside the customer server. Probes external reachability and performs authorized recovery (cloud reboot, restart) even when the internal server completely crashes.

---

## 3. Repository Structure

```text
ryvix/
├── .ai/                    # AI Coding Agent guidance & operational context
│   ├── AGENTS.md           # Instructions for AI coding assistants
│   ├── CONTEXT.md          # Concise project summary and current status
│   ├── RULES.md            # Mandatory engineering invariants & safety rules
│   ├── ARCHITECTURE.md     # High-level architecture reference
│   ├── SECURITY.md         # Credential boundaries & permission rules
│   ├── INTEGRATIONS.md     # Integration interface definitions
│   ├── DEVELOPMENT.md      # Development workflow, testing, & guidelines
│   └── CURRENT_TASK.md     # Active implementation milestone tracking
│
├── docs/                   # Complete architectural and product documentation
│   ├── architecture/       # Deep-dive system architecture specifications
│   ├── product/            # Product definition, user flows, and operational guides
│   ├── security/           # Threat modeling, credential vaulting, and detection rules
│   ├── integrations/       # Technical specs for GitHub, Gmail, WhatsApp, Supabase, etc.
│   ├── database/           # Schema definitions, ERD, and migration strategy
│   ├── decisions/          # Architecture Decision Records (ADRs)
│   └── plans/              # Multi-phase implementation roadmap
│
├── ai/                     # AI orchestration, prompts, and model adapters
├── backend/                # Core API, permission engine, and orchestrator
├── web/                    # Next.js web application and Web Chat console
├── services/               # Background workers (coding, telemetry, connectors)
├── packages/               # Shared libraries, SDKs, and types
├── infrastructure/         # Deployment manifests, Docker Compose, Terraform
├── supabase/               # Database migrations, seed data, and Edge Functions
├── tests/                  # Integration, unit, and end-to-end test suites
├── scripts/                # Verification, build, and management utilities
├── .env.example            # Sanitized environment variable template
└── .gitignore              # Git ignore rules
```

---

## 4. Engineering Invariants

1. **No Raw Credentials to AI**: Credentials (GitHub tokens, SSH keys, database strings, API keys) are stored in secure vaults and handled strictly by the backend/worker layers. The AI only sees opaque tool interfaces.
2. **No Unrestricted Server Shells**: Server actions are bounded by typed capability manifests; arbitrary raw root shells are strictly prohibited.
3. **Full Auditability**: Every user request, AI plan, tool invocation, connector command, code diff, build output, and deployment verification is recorded in an immutable audit ledger.
4. **Deterministic Detection First**: Security monitoring relies on deterministic rules and anomaly heuristics first. AI is leveraged for deep forensic analysis, explanation, and human-guided recovery.
5. **Customer CI/CD Preservation**: Ryvix integrates with existing customer CI/CD pipelines instead of replacing them.

---

## 5. Getting Started (Documentation & Roadmap)

* To understand system architecture, begin with [`docs/architecture/SYSTEM_ARCHITECTURE.md`](./docs/architecture/SYSTEM_ARCHITECTURE.md).
* To review the phased development schedule, read [`docs/plans/IMPLEMENTATION_ROADMAP.md`](./docs/plans/IMPLEMENTATION_ROADMAP.md).
* For AI coding agents working on this repo, consult [`.ai/AGENTS.md`](./.ai/AGENTS.md) and [`.ai/RULES.md`](./.ai/RULES.md).
