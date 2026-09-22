# Ryvix Model Evaluation Data & Benchmark Protocol

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
