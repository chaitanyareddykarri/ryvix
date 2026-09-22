# Ryvix Dedicated LLM Gateway Architecture

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
