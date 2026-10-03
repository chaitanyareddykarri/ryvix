# Ryvix Model Evaluation Data & Benchmark Protocol

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


## 1. Dataset Format
Exported datasets conform to standard JSONL format compatible with Hugging Face SFTTrainer and PyTorch training pipelines:

```json
{"messages": [
  {"role": "system", "content": "You are Ryvix Autonomous Software Operations AI. Formulate structured execution plans from refined requirements."},
  {"role": "user", "content": "{\"rawPrompt\": \"...\", \"refinedRequirement\": {...}, \"context\": {...}}"},
  {"role": "assistant", "content": "{\"planTitle\": \"...\", \"steps\": [...]}"}
]}
```

## 2. Evaluation Metrics
The `ModelReadinessManager` tracks performance against 6 core quality metrics:
- **Plan Validation Pass Rate**: Percentage of generated plans that pass schema, tool authorization, and scope checks without syntax or policy errors.
- **User Approval Rate**: Percentage of generated previews and diffs approved by the user.
- **Build & Test Success Rate**: Percentage of code patches that compile and pass regression suites in the Docker sandbox on the first attempt.
- **Inference Latency**: Total turn-around time from user prompt to validated plan.
- **Quality Score**: Composite weighted score (0.0 - 1.0) factoring in validation, build pass, and user approval.
- **Zero-Secrets Verification**: Automated check guaranteeing 0 API keys or private credentials exist in the exported training data.
