# Ryvix System Architecture Reference

This document provides the authoritative architectural map for AI agents and engineers working on Ryvix.

---

## 1. Top-Level System Topology

```
                         USER (Web / WhatsApp / Gmail / Slack)
                                          │
                                          ▼
                                    RYVIX BACKEND
                                          │
               ┌──────────────────────────┼──────────────────────────┐
               │                          │                          │
        AI ORCHESTRATOR           EXTERNAL CONNECTORS         SECURITY & RBAC
      (Provider Agnostic)       (GitHub, WhatsApp, Cloud)     (Multi-Tenancy)
               │                          │                          │
               └──────────────────────────┼──────────────────────────┘
                                          │
                                          ▼
                                   EXECUTION ENGINE
               ┌──────────────────────────┼──────────────────────────┐
               │                          │                          │
       GitHub Integration          Docker Sandbox            Customer Servers
        (Pull Requests)         (Build, Test, Preview)      (Metrics & Logs)
                                                                     │
                                                                     ▼
                                                              DETECTION ENGINE
                                                           Deterministic Rules
                                                                     │
                                                                     ▼
                                                              DIAGNOSIS ENGINE
                                                           AI Forensic Correlator
                                                                     │
                                                                     ▼
                                                          RECOVERY PLAN FORMULATION
                                                                     │
                                                                     ▼
                                                             HUMAN-IN-THE-LOOP
                                                        (Web / WhatsApp Approval)
                                                                     │
                                                                     ▼
                                                             CONTROLLED ACTION
                                                          (Restart / Block / Kill)
                                                                     │
                                                                     ▼
                                                          POST-RECOVERY VERIFY
                                                                     │
                                                                     ▼
                                                           IMMUTABLE AUDIT LOG
```

---

## 2. Core Subsystems

| Subsystem | Primary Responsibilities | Architectural Invariant | Key Docs |
| :--- | :--- | :--- | :--- |
| **AI Orchestrator** | 10-step planning, tool selection, diff synthesis, log forensics. | Zero direct database keys, zero raw shell commands. Provider-agnostic. | [`docs/verification/AI_ORCHESTRATION_AUDIT.md`](../docs/verification/AI_ORCHESTRATION_AUDIT.md) |
| **Backend Control Plane** | Authentication, RBAC, tool validation, policy checks, immutable audit logging. | Gatekeeper for all data and infrastructure actions. | [`docs/architecture/BACKEND_ARCHITECTURE.md`](../docs/architecture/BACKEND_ARCHITECTURE.md) |
| **Supabase Data Layer** | Multi-tenant PostgreSQL, Auth, RLS, Realtime. | Cloud-hosted at `tsoyrpgifovzwqtgpkkb`. Never containerized locally. | [`docs/database/DATA_MODEL.md`](../docs/database/DATA_MODEL.md) |
| **Coding Workspaces** | Ephemeral Docker sandboxes for stack-aware builds, tests, and previews. | Non-root `UID 1000`, 2 vCPUs, 4GB RAM, 15m timeout. No `/var/run/docker.sock`. | [`docs/infrastructure/CODING_WORKSPACE_ARCHITECTURE.md`](../docs/infrastructure/CODING_WORKSPACE_ARCHITECTURE.md) |
| **Server Monitoring** | Real-time telemetry (CPU/RAM/Disk/IOPS/Network, processes, systemd, logs). | Dual-path: In-band daemon + out-of-band cloud hypervisor probe. | [`docs/verification/SERVER_MONITORING_AUDIT.md`](../docs/verification/SERVER_MONITORING_AUDIT.md) |
| **Self-Healing Engine** | Anomaly detection, root cause diagnosis, 4-tier recovery, circuit breakers. | Level 3 requires human approval. Max 3 attempts, exponential cooldown. | [`docs/verification/SELF_HEALING_ARCHITECTURE_AUDIT.md`](../docs/verification/SELF_HEALING_ARCHITECTURE_AUDIT.md) |
| **Multi-Channel Ingestion**| Web console, WhatsApp Cloud API, Gmail webhooks. | Transactional Auth OTPs separated from customer communication. | [`docs/integrations/`](../docs/integrations/) |

---

## 3. Extensibility Registries

Ryvix uses five core registries to prevent hardcoding:
1. `ModelProviderRegistry`: Hugging Face, OpenAI, Anthropic, vLLM.
2. `ConnectorRegistry`: GitHub, WhatsApp, Gmail, Slack, In-band daemon, AWS EC2.
3. `ToolRegistry`: Whitelisted backend capability handlers.
4. `WorkspaceProfileRegistry`: Node.js, Python, .NET, Rust, Go, Flutter.
5. `DeploymentAdapterRegistry`: Docker, Kubernetes, Vercel, AWS ECS.

---

## 4. Mem0 3-Tier Cognitive Memory Architecture & Unified AI Training

The platform incorporates an embedded 3-tier cognitive memory architecture (`ai/src/memory/`):

1. **Short-Term Working Memory (`ShortTermMemoryManager`)**:
   - Sliding-window turn buffer (default: 20 turns) to prevent context explosion.
   - Session-isolated task scratchpad for transient tool observations, active files, and pending user clarifications.
   - TTL session eviction (2 hours default).
2. **Long-Term Persistent Memory (`LongTermMemoryManager`)**:
   - Persists declarative facts across `USER_PREFERENCE`, `TECH_STACK`, `SYSTEM_CONFIG`, `HISTORICAL_INCIDENT`, and `SECURITY_POLICY`.
   - Natural language heuristic extraction automatically identifies and persists user preferences and operational facts.
   - Saved atomically to `ai/data/long_term_cognitive_memory.json`.
3. **Semantic Associative Vector Memory (`SemanticMemoryManager`)**:
   - 64-dimensional Float32Array unit sphere vectors with sub-millisecond execution (<0.02ms).
   - Dot-product cosine similarity retrieval matching associative runbooks and experiences.
   - Saved atomically to `ai/data/semantic_cognitive_memory.json`.
4. **Unified Cognitive Controller (`cognitiveMemory`)**:
   - Single unified interface for `recordInteraction()`, `recall()`, and `distillSession()`.
   - Integrated into `RyvixAgiCore.executeOodaCycle()` and `web/app/api/chat/route.ts` real-time SSE streaming.
5. **Unified AI Training Pipeline**:
   - `npm run train:all`: Trains pattern recognition, deep self-training (Stages 12 & 13), weight matrix optimization, and distillation in ~2.38s.
6. **Deep Cognitive Subsystems**:
   - Semantic Vector Cache, GraphRAG Topology Graph, Multi-Agent Swarm Jury, MCTS Planner, Speculative Simulator, Reflexion Loop, Fleet Forecaster, and DPO Preference Ledger.
7. **Master Verification**:
   - 37 Automated Test Suites passing (`tests/run-all.ts`), 100% green.
