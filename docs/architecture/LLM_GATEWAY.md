# Ryvix Dedicated LLM Gateway Architecture

## Implementation checkpoint — 2026-10-03

Code checkpoint: `d81b281`; applied migrations through `20261003000004`.
Implemented: reviewed experience/personal memory, bounded repository indexing,
Gmail SMTP email, WhatsApp OTP identity, opt-in AI replies/history/quotas, confirmed
coding requests, task notifications and authenticated approval handoffs. Releases
and server operations retain their existing web authorization and approval checks.
Recorded verification: 79 project suites plus 15 Node checks, typecheck/lint/build
and 125 database boundary checks passed. Provider delivery, deployed workers/browser
acceptance and representative model accuracy remain unverified.

See [project status](../PROJECT_STATUS.md), [assistant setup](../infrastructure/WHATSAPP_ASSISTANT.md) and
[recorded verification](../verification/WHATSAPP_ASSISTANT_2026_10_03.md). This documentation update did not rerun those
code checks. Detailed designs below may include planned capabilities; the status
index distinguishes implemented behavior from future work.


## 1. Architectural Boundary
The LLM Gateway (`AIAgentLLMGateway` / `ModelGateway`) provides a decoupled, provider-agnostic abstraction that shields the rest of Ryvix from vendor lock-in.

```
Ryvix Task Context
       ↓
AIAgentLLMGateway
       ↓
+-------------------------------------------------------------+
| Multi-Tier Provider Failover Chain                          |
| Tier 1: Groq (llama-3.3-70b-versatile, ultra-low latency)    |
| Tier 2: Hugging Face (Qwen/Qwen2.5-Coder-32B-Instruct)      |
| Tier 3: Google Gemini (gemini-1.5-flash / pro)              |
| Tier 4: Local Ollama (codellama, deepseek-coder)             |
| Standby: Ryvix Local Deterministic Planning Engine          |
+-------------------------------------------------------------+
       ↓
Enforced Structured JSON Schema (Plan & PlanStep)
       ↓
Plan Validation Engine
```

## 2. Key Capabilities
- **Provider Interchangeability**: Configured via environment variables and model adapter classes without changing application code.
- **Rate-Limit Resilience (HTTP 429)**: Automatically switches to secondary tiers when a provider hits daily quotas.
- **Zero-Outage Local Fallback**: When external cloud networks are offline, the local deterministic engine synthesizes validated 10-step execution plans.
- **Schema Enforcement**: Strictly enforces JSON outputs matching `@ryvix/database` `Plan` and `PlanStep` definitions. Free-form arbitrary shell execution is blocked.
- **Latency Optimization**: Incorporates in-memory pattern caching (<5ms response for identical intents).
