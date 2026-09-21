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
