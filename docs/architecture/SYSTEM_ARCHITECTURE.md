# Ryvix System Architecture Specification

## 1. Executive Architecture Summary

Ryvix is an AI-powered autonomous software and infrastructure operations platform. It unifies source-code manipulation, deployment verification, runtime telemetry monitoring, incident forensics, and server lifecycle operations into a single platform governed by human-in-the-loop policies.

The core design philosophy enforces strict isolation between:
1. **The Intelligence Layer (AI Model / Hugging Face)**: Decoupled reasoning engine emitting structured plans and tool invocations.
2. **The Control Layer (Ryvix Backend / Orchestrator)**: Secure control plane enforcing authentication, project multi-tenancy, tool validation, human approval gates, and immutable audit trails.
3. **The Data Foundation (Supabase)**: Managed PostgreSQL, Supabase Auth, Realtime WebSocket streams, and object storage.
4. **The Execution Layer (Workers & Workspaces)**: Isolated ephemeral sandboxes for stack-aware builds, tests, previews, and telemetry ingestion.
5. **The Operational Bridge (Dual Connectors)**: In-host telemetry daemon (Internal) paired with an independent out-of-band cloud recovery controller (External).

---

## 2. End-to-End System Topology

```
                                    +--------------------+
                                    |      CUSTOMER      |
                                    +--------------------+
                                              |
                   +--------------------------+--------------------------+
                   |                          |                          |
                   v                          v                          v
         +-------------------+      +-------------------+      +-------------------+
         |      WEB APP      |      |     WHATSAPP      |      |       GMAIL       |
         | Next.js Dashboard |      | Meta Cloud API    |      | OAuth 2.0 Webhook |
         | & Web Chat Console|      | Webhook Ingestion |      | Notification Feed |
         +-------------------+      +-------------------+      +-------------------+
                   |                          |                          |
                   +--------------------------+--------------------------+
                                              |
                                              v
                              +--------------------------------+
                              |      RYVIX BACKEND API         |
                              |   - REST / tRPC Gateway        |
                              |   - Authentication & AuthZ     |
                              |   - Permission & Policy Engine |
                              |   - Immutable Audit Logger     |
                              +--------------------------------+
                                       |              |
                    +------------------+              +------------------+
                    |                                                    |
                    v                                                    v
      +----------------------------+                       +----------------------------+
      |    SUPABASE FOUNDATION     |                       |    RYVIX WORKER ENGINE     |
      | - PostgreSQL (App Data)    |                       | - BullMQ / Redis Task Queue|
      | - Supabase Auth            |                       | - AI Task Orchestrator     |
      | - Realtime Subscriptions   |                       | - Coding Workspace Engine  |
      | - Storage (Previews)       |                       | - Telemetry Stream Engine  |
      | - Row Level Security (RLS) |                       | - Connector Gateway        |
      +----------------------------+                       +----------------------------+
                                                                         |
                        +------------------------------------------------+
                        |                        |                       |
                        v                        v                       v
         +-----------------------------+ +---------------+ +-----------------------------+
         |     AI MODEL GATEWAY        | |    CODING     | |      CUSTOMER SYSTEMS       |
         | - Hugging Face Endpoint     | |   WORKSPACE   | | +-------------------------+ |
         | - Planning & Tool Selection | | - Ephemeral   | | |    Internal Connector   | |
         | - Code Diff Generation      | |   Sandboxes   | | |    - In-Host Agent      | |
         | - Incident Forensics        | | - Stack Build | | |    - Logs, Metrics, OS  | |
         +-----------------------------+ | - Test Runner | | +-------------------------+ |
                                         | - Preview Svc | | +-------------------------+ |
                                         +---------------+ | |  External Control Path  | |
                                                           | |  - Out-of-Band Probe    | |
                                                           | |  - Cloud Recovery API   | |
                                                           | +-------------------------+ |
                                                           +-----------------------------+
```

---

## 3. Subsystem Breakdown & Component Contracts

### 3.1 Client Ingestion Layer
- **Web Application (`web/`)**: Built on Next.js, providing visual dashboards for project telemetry, live Web Chat, interactive diff reviews, and sandboxed iframe previews.
- **WhatsApp Gateway (`services/communication/whatsapp`)**: Handles incoming conversational requests and dispatches urgent incident alerts and approval cards to on-call engineers.
- **Gmail Integration (`services/communication/gmail`)**: Provides email-based notification digests and command processing for authorized customer email accounts.

### 3.2 Ryvix Backend Orchestrator (`backend/`)
- Intercepts all client requests and enforces project-level role-based access control (RBAC).
- Manages the lifecycle of asynchronous **Tasks** (QUEUED, PLANNING, AWAITING_APPROVAL, EXECUTING, VERIFYING, COMPLETED, FAILED).
- Mediates all tool calls between the AI Model and target execution engines.
- Implements the **Policy Gate**: Intercepts potentially destructive operations and halts execution until explicit customer approval is granted.

### 3.3 Supabase Application Foundation (`supabase/`)
- Serves as the central multi-tenant relational datastore.
- Enforces strict data tenancy via PostgreSQL Row Level Security (RLS).
- Publishes database change notifications over Supabase Realtime to power instantaneous Web Chat and telemetry dashboard updates.

### 3.4 Ryvix Workers (`services/worker/`)
- Asynchronous task processors backed by Redis/BullMQ.
- Handles heavy, long-running processes: git clone operations, dependency installations, test suite execution, container builds, and high-volume telemetry ingestion.

### 3.5 AI Intelligence Layer (`ai/`)
- Hosted on Hugging Face or managed LLM endpoints.
- Pure stateless reasoning engine. Consumes structured context packages (repo map, stack clues, diagnostic logs) and outputs structured tool invocations.

### 3.6 Ephemeral Coding Workspaces (`services/workspace/`)
- Provisioned on-demand according to detected technology stack.
- Executes isolated build and test scripts without polluting the main host or customer servers.
- Packages static assets or spins up temporary development servers to generate isolated frontend previews.

### 3.7 Dual Connector Architecture (`services/connector/`)
- **Internal Connector**: Runs directly inside customer Linux servers or container clusters. Streams logs and OS telemetry; executes whitelisted internal commands.
- **External Connector (Out-of-Band)**: Independent monitoring workers that perform external reachability checks and interface directly with customer cloud provider APIs (AWS, DigitalOcean, Hetzner) to execute hard reboots or power resets when the server crashes.

---

## 4. Responsibility Boundaries Matrix

| Component | Allowed Responsibilities | Strictly Prohibited Actions |
| :--- | :--- | :--- |
| **Ryvix AI Model** | Reasoning, planning, code diff generation, log analysis, tool selection. | Accessing database directly, holding credentials, executing shell commands directly. |
| **Ryvix Backend** | Auth verification, permission checks, task state machine, tool dispatch, audit. | Long-running blocking tasks (delegated to workers). |
| **Supabase** | Auth, Postgres DB, Realtime, Storage, RLS policies. | Running heavy AI jobs or workspace compilations. |
| **Internal Connector** | In-host telemetry streaming, log collection, whitelisted service restarts. | Unrestricted raw root shell execution, arbitrary network tunneling. |
| **External Connector** | Out-of-band health probing, cloud infrastructure recovery (reboot/power). | Direct access to server filesystem or internal OS memory. |
| **Coding Workspace**| Stack-aware build execution, automated testing, ephemeral preview hosting. | Modifying production git branches directly without backend approval. |

---

## 5. Architectural Invariants

1. **AI Isolation**: The intelligence layer is completely decoupled from credentials and database connections.
2. **Fail-Safe Connector Independence**: Internal and external connectors operate independently; catastrophic failure of the customer host never blinds the external recovery path.
3. **Audit Ledger Immutability**: All operational actions, code diffs, approvals, and AI tool calls are recorded permanently in append-only audit tables.
4. **Zero CI/CD Replacement**: Ryvix complements existing customer CI/CD pipelines by committing to authorized Git branches and verifying deployment health post-rollout.
