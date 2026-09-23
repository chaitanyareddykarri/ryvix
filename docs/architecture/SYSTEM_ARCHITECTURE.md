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

---

## 6. Cognitive Memory Architecture (Mem0 Integration)

Ryvix features an embedded 3-tier cognitive memory architecture (`ai/src/memory/`):

1. **Short-Term Working Memory (`ShortTermMemoryManager`)**:
   - Manages active conversation turns with sliding-window capacity.
   - Provides transient session-isolated scratchpads for active files, commands, and intermediate inferences.
   - Implements automatic TTL expiration for stale sessions.
2. **Long-Term Persistent Memory (`LongTermMemoryManager`)**:
   - Persists declarative facts across `USER_PREFERENCE`, `TECH_STACK`, `SYSTEM_CONFIG`, `HISTORICAL_INCIDENT`, and `SECURITY_POLICY`.
   - Automatically extracts and registers user preferences and operational facts from natural language.
   - Saves atomically to `ai/data/long_term_cognitive_memory.json`.
3. **Semantic Associative Vector Memory (`SemanticMemoryManager`)**:
   - Generates 64-dimensional Float32Array unit sphere vectors with sub-millisecond execution.
   - Computes dot-product cosine similarity to retrieve associative runbooks, past incident solutions, and architectural principles.
   - Saves atomically to `ai/data/semantic_cognitive_memory.json`.
4. **Unified Cognitive Controller (`cognitiveMemory`)**:
   - Glues all 3 tiers into unified `recordInteraction()`, `recall()`, and `distillSession()` workflows.
   - Seamlessly integrated with `RyvixAgiCore.executeOodaCycle()` and `web/app/api/chat/route.ts` real-time SSE streaming.

---

## 7. Master Test Suite Matrix (39/39 Suites Operational)

The entire platform is backed by **39 automated test suites** (`tests/run-all.ts`), validating multi-tenant cryptographic auth, 100% 6-digit email OTP flows, Docker sandboxes, SRE outage triage, neural threat classification, dialectic multi-LLM debate, and Mem0 cognitive memory in under 1.5 seconds.

---

## 8. Deep Cognitive Autonomous Intelligence Architecture

The intelligence plane is powered by 8 specialized cognitive engines:
1. **Semantic Vector Cache (`ai/src/semantic-cache.ts`)**: <0.01ms instant serving on high-similarity queries (>0.92).
2. **GraphRAG Topology Graph (`ai/src/graph-rag.ts`)**: Entity-relationship spatial graph with cascading blast radius and BFS pathfinding.
3. **Multi-Agent Swarm Jury (`ai/src/swarm-jury.ts`)**: 4-agent council (Security, SRE, Architecture, Judge) governing high-risk operations.
4. **MCTS Planner (`ai/src/mcts-planner.ts`)**: Branching tree-of-thought exploration with UCB1 selection and risk rollouts.
5. **Speculative Simulator (`ai/src/speculative-simulator.ts`)**: Shadow dry-run execution emitting cryptographic `DryRunCertificates`.
6. **Reflexion Engine (`ai/src/reflexion-engine.ts`)**: ReAct + Self-Critique trial loop that converges autonomously on verified code.
7. **Proactive SRE Forecaster (`ai/src/predictive-forecast.ts`)**: Telemetry slope analysis predicting Time-To-Failure (TTF).
8. **DPO Experience Ledger (`ai/src/experience-ledger.ts`)**: Captures preference pairs for continuous model fine-tuning.


---

## 9. Frontier Deep Learning Architectures & Zero-Collision Dual-Engine System

Ryvix unifies six cutting-edge deep learning systems operating on Float32Array SIMD microsecond tensor mathematics with external Large Language Models (LLMs) under the **Epistemic Guardian Pattern**:

1. **Mixture of Experts (MoE) Dynamic Gating (`ai/src/deep-learning/mixture-of-experts.ts`)**: Top-2 softmax gating over 5 domain-specialized expert subnets (Security, SRE, Architecture, Kernel, Network) executing in `<0.05ms`.
2. **Graph Neural Networks (GNN) Message-Passing (`ai/src/deep-learning/graph-neural-network.ts`)**: 2-layer spatial graph convolutions computing vulnerability diffusion and systemic bottlenecks in `<0.16ms`.
3. **Latent World Model Simulator ("AI Dreaming Engine") (`ai/src/deep-learning/latent-world-model.ts`)**: Evaluates 50 parallel forward rollout timelines across multi-step action horizons in latent space to project downtime risk before dispatch.
4. **Contrastive Representation Learning (InfoNCE) (`ai/src/deep-learning/contrastive-learner.ts`)**: L2-normalized 32-D hypersphere embedding with InfoNCE loss detecting novel zero-day anomalies in `<0.04ms`.
5. **Elastic Weight Consolidation (EWC) (`ai/src/deep-learning/elastic-weight-consolidation.ts`)**: Diagonal Fisher Information Matrix quadratic regularizer penalizing catastrophic forgetting during continuous adaptation.
6. **Direct Preference Optimization (DPO) Trajectory Alignment (`ai/src/deep-learning/trajectory-dpo-tuner.ts`)**: Closed-form log-ratio margin alignment directly optimizing self-healing policies from execution outcomes without RLHF reward modeling.

### Zero-Collision Dual-Engine Guarantees
- **Epistemic Guardian Pattern**: External LLMs (Claude 3.7 / GPT-4o / DeepSeek R1) are confined to natural language dialogue and System-2 dialectic reasoning. Local deep learning models enforce deterministic invariants in `<0.05ms`.
- **Deterministic Action Gating**: Remediation actions proposed by LLMs are simulated in the Latent World Model and checked against GNN blast-radius boundaries. If projected downtime risk exceeds 15%, the Swarm Jury immediately vetoes execution.
- **Zero Collision**: LLMs never mutate deep learning weights directly, and local deep learning networks never generate unverified code. Local tensor states are passed to LLMs strictly as immutable prompt context.
