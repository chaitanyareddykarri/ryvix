# Ryvix Model-Readiness & Fine-Tuning Strategy

## 1. Strategic Principles
1. **Do NOT Train From Scratch**: Ryvix leverages strong foundational open-source models (such as Qwen 2.5 Coder 32B or LLaMA 3.3 70B) paired with structured prompts, context retrieval, tool registries, and validation gates.
2. **Model-Readiness First**: The system continuously captures high-quality execution trajectories from real operations to build a clean, curated training dataset.
3. **Strict Separation of Data Tiers**:
   - **Production Execution Data**: Ephemeral, session-scoped telemetry in memory/database.
   - **Evaluation Benchmark Data**: Curated set of regression scenarios for automated testing and CI.
   - **Fine-Tuning Datasets**: Sanitized, deduplicated, anonymized JSONL instruction pairs.

## 2. The Execution Trajectory Tuple
Every candidate training sample must contain complete end-to-end evidence:
```
USER REQUEST
   ↓
RYVIX REFINED REQUIREMENT
   ↓
SCOPED CONTEXT SUMMARY
   ↓
LLM STRUCTURED PLAN
   ↓
VALIDATION RESULT (Schema, Tools, Scope)
   ↓
BUILD & TEST VERIFICATION (Exit Code 0)
   ↓
USER ACTION APPROVAL (Approved / Rejected)
   ↓
FINAL RECOVERY / DEPLOYMENT OUTCOME
```

## 3. Data Quality & Zero-Secrets Guarantee
- Raw user text containing credentials, passwords, private keys, or tokens is stripped via regular expressions before dataset export.
- Rejected or failed plans are flagged with failure reasons for negative-example / DPO alignment training.
- Only reviewed and user-approved executions are exported for supervised fine-tuning (SFT).
