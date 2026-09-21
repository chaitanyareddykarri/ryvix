# Audit: AI Orchestration & Model Provider Architecture

## 1. Executive Summary

Ryvix treats AI as a **stateless, reasoning and planning engine**. It strictly isolates the LLM from:
1. Direct database connections and SQL execution.
2. Raw shell and operating system execution.
3. Raw external third-party API credentials.

Furthermore, Ryvix is **strictly provider-agnostic**: it avoids hardcoding around any single LLM, model architecture, hosting provider, or inference API.

---

## 2. Pluggable Model Provider Architecture

```
                       Ryvix AI Gateway
                              │
                              ▼
                  ModelProviderRegistry
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
Hugging Face Inference     OpenAI API          Anthropic API /
    Endpoints            (GPT-4o, etc.)        Local vLLM / Ollama
(DeepSeek / Llama)
```

### Supported Provider Adapter Contract
All model integrations must implement the standardized `IModelProvider` interface:
- `generatePlan(prompt: string, context: ContextPackage): Promise<AIPlanOutput>`
- `selectTools(planStep: PlanStep, availableTools: ToolDefinition[]): Promise<ToolCallProposal[]>`
- `diagnoseIncident(telemetry: IncidentTelemetry): Promise<IncidentDiagnosis>`
- `healthCheck(): Promise<{ available: boolean; latencyMs: number }>`

---

## 3. The 10-Step AI Orchestration Workflow

```
User (Web / WhatsApp / Gmail)
  │
  ▼
1. RECEIVE USER INTENT (Ingestion & channel normalization)
  │
  ▼
2. GATHER CONTEXT (AST repository tree, environment profile, recent logs)
  │
  ▼
3. CREATE STRUCTURED PLAN (Multi-step plan with approval flags)
  │
  ▼
4. SELECT TOOLS (Whitelisted capability matching)
  │
  ▼
5. REQUEST MODEL REASONING (Prompt assembly & schema-constrained inference)
  │
  ▼
6. EXECUTE VIA AUTHORIZED BACKEND PATH (Auth check, multi-tenant isolation, RBAC)
  │
  ▼
7. INSPECT RESULTS (Stdout, stderr, exit code, diff validation)
  │
  ▼
8. RE-PLAN / CONTINUE IF NECESSARY (Handle intermediate failures or next step)
  │
  ▼
9. VERIFY FINAL RESULT (Automated build, test suite, HTTP health check)
  │
  ▼
10. REPORT RESULT (Card dispatch to Web console, WhatsApp, or Gmail digest)
```

---

## 4. Strict Security Invariants for AI Execution

| Category | Prohibited Invariant | Required Architectural Enforcement |
| :--- | :--- | :--- |
| **Database Access** | Direct SQL or PostgreSQL connections by AI | AI only emits data transfer objects (`PlanStep`). Backend executes parameterized queries. |
| **Shell Access** | Arbitrary terminal command execution (`exec`, `system`) | AI requests whitelisted tools (`repo.read_tree`, `service.restart`). Backend validates and runs capability. |
| **Credential Exposure**| Passing GitHub tokens, Gmail OAuth, or AWS keys in prompt | Credentials live in backend environment/vault. Backend injects tokens only at execution time. |
| **Model Lock-In** | Hardcoding vendor-specific API responses in business logic | Normalized JSON schema enforced across all model providers. |

---

## 5. Audit Verdict

* **Provider Agnosticism**: Verified. Model provider registry decoupled from core engine.
* **10-Step Workflow**: Fully mapped and documented.
* **Security Controls**: Enforced. Zero arbitrary command or SQL execution in AI layer.
* **Status**: **PASSED (AI Orchestration Architecture Verified)**.
