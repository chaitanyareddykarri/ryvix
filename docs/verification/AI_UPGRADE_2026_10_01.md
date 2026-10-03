# Grounded AI conversation upgrade

## Historical report — current reference updated 2026-10-03

The original findings, counts and pending lists below remain historical evidence.
Current code is `d81b281`, schema `20261003000004`; see
[project status](../PROJECT_STATUS.md) and [latest verification](WHATSAPP_ASSISTANT_2026_10_03.md).
Do not interpret older missing-feature lists as current or fixture passes as real
provider/browser certification. No historical test result was changed or rerun
by this documentation update.


## Implemented

- Database history belongs to one user and organization, with membership checks
  on read/write and owner RLS. Completed question/answer pairs are retained; partial
  or cancelled generations are not. Model input uses at most 12 pairs and 24000
  characters. Older large turns are explicitly truncated. Per-owner leases and
  creation budgets apply across web replicas. Conversations retain up to 100 turns;
  turns older than 30 days are pruned when their conversation is accessed.
- Both chat screens send conversation IDs on follow-ups. `/chat` provides a New
  conversation action. IDs are held in component memory; automatic reload recovery
  and a conversation archive browser are not implemented.
- Retrieval searches authorized incident titles/diagnoses and saved task artifact
  filenames/content, including Markdown documentation captured in those artifacts.
  Source IDs, dates and snapshot labels accompany bounded sanitized excerpts.
  This is lexical retrieval over available records, not live GitHub crawling or
  semantic indexing of the complete repository. No matching snapshot means no
  repository evidence; the model must disclose that limitation.
- The existing gateway streams actual provider SSE. Compatible providers,
  Anthropic text deltas and Hugging Face token events have separate decoding paths.
  Fragmented frames, provider errors, premature EOF, truncation, cancellation and
  size/time limits are handled. Failover stops after text becomes visible. Unknown
  token counts are not invented. Provider/model attribution accompanies responses.
- Both streaming and JSON chat use a 4096-token answer limit. History, observations
  and retrieval have independent character budgets. The explanation policy favors
  direct answers, continuity, source references and explicit uncertainty. Chat does
  not execute actions or fabricate an internal reasoning trace.
- The classifier singleton loads saved weights on startup and validates dimensions,
  class order, tensor lengths, finite values and maximum file size. Invalid files
  are rejected atomically. `neuralWeightsStatus` exposes loaded/rejected/missing
  state. A missing file does not represent a trained classifier: the class still
  initializes weights for training; consumers must not call that trained accuracy.
- Added an eight-case authored answer rubric and scoring CLI, plus a classifier
  evaluator for supplied held-out labeled events. Metrics are measured only when
  actual answers or samples are supplied. Rubric checks require human review and
  do not establish general intelligence or production accuracy.

## Configuration and verification

`RYVIX_CHAT_PROVIDER` optionally pins a gateway provider. `GEMINI_MODEL`,
`GROQ_MODEL`, `OPENAI_MODEL`, `CLAUDE_MODEL`, `HUGGINGFACE_MODEL` and `OLLAMA_MODEL`
override the chat model identifier. Configure supported model IDs for the account;
the historical defaults are not evidence of current provider availability.
`RYVIX_NEURAL_WEIGHTS_PATH` optionally specifies a saved classifier checkpoint.

Commands:

```text
npm run verify:chat
npm run eval:ai -- --live
npm run eval:ai -- --answers path/to/answers.json
npm run eval:classifier -- path/to/held-out-events.json
```

Saved answers are a JSON object keyed by IDs in `tests/fixtures/chat-evaluation.json`.
Classifier inputs are an array of `{ "label": "CLASS_NAME", "event": { ... } }`,
using the vectorizer's telemetry/log event shape. Accuracy, per-class precision,
recall, F1 and a confusion matrix are reported without printing raw events.
Dataset provenance and train/test separation must be established by the operator.

ADR-019 migrations `20261001000001` and `20261001000002` were applied using the
existing Supabase CLI workflow with verified TLS. Live SQL fixtures exercised
history persistence, follow-ups, lease conflicts, cross-tenant and same-tenant
user isolation, revoked membership and browser mutation denial, then rolled back.
These fixtures are not provider-issued JWT/browser tests.

Verification completed for this phase: the project test suite passed 68 suites
with 0 failures and 15 Node-level checks; type checking, linting and the full
production build passed. The database-boundary verifier passed 67 checks. The
live chat verification passed persistence, follow-up history, retrieval SQL
compatibility, lease conflicts and tenant isolation, with fixtures rolled back.
The live answer evaluator found no configured provider input and therefore
returned no quality score; this is an environment limitation, not a model
quality result.

The local saved weight file loaded successfully. No live model-quality score or
real unseen-production-data accuracy is claimed: provider credentials and a
representative labeled holdout dataset were not available in this workspace.
Live provider/browser verification remains necessary before deployment certification.

Provider protocol references:
[Groq streaming](https://console.groq.com/docs/text-chat),
[Gemini compatibility](https://ai.google.dev/gemini-api/docs/openai),
[Anthropic streaming](https://platform.claude.com/docs/en/build-with-claude/streaming).
