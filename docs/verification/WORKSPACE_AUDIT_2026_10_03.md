# Workspace audit — 2026-10-03

Follow-up: the simulator, false-green test and empty DPO metrics are addressed in
[the first remediation batch](AUDIT_REMEDIATION_2026_10_03.md). Findings below
retain the original audit state; use [pending work](../PENDING_WORK.md) for current status.

Audited working tree based on 172be2b. Reviewed Git history and available project
session/checkpoint records, current entry points, AI components, workers, channel
flows, dependency audit and automated verification. This is a broad repository
audit, not a claim that every historical conversation was available, every line
was exhaustively reviewed, or every possible vulnerability was excluded.
No application fixes, provider sends, deployments or training were performed.

## Fresh verification

| Check | Result |
| --- | --- |
| Typecheck | Passed |
| Lint | Passed; Next lint CLI deprecation warning |
| Production build | Passed |
| npm test | 79 suites passed, 0 failed; another 15 Node checks passed |
| Go tests and vet | Passed, including dispatcher on this Windows run |
| Hosted database boundaries | 125 checks passed, 0 failures; read-only |
| Migration ledger | No numbered migrations missing |
| Secret regression scan | 0 findings |
| Runtime readiness | Fails: local provider/deployment configuration missing |
| npm audit | 5 high-severity dependency entries in the development tool chain |
| npm audit --omit=dev | 0 reported production dependency vulnerabilities |

All 12 existing ai/data files were backed up before tests and restored with matching
SHA-256 hashes. The pre-existing nine dirty runtime files and web/next.config.mjs
remain outside this report's changes. Test logs and read-only probes are in ignored
tmp/audit-* files. Passing tests do not establish live end-to-end delivery.

## Confirmed defects and misleading claims

1. **High: experimental simulator can reverse a destructive verdict.**
   ai/src/speculative-simulator.ts:79 resets isSafe and recommendation when the
   string starts with a nominally read-only command. A string-only probe returned
   STRICTLY_BLOCKED for `rm -rf /`, but DISPATCH_APPROVED for
   `cat /dev/null; rm -rf /`. No command was executed. This is not proof of a
   production server-command bypass: production uses separate authorization,
   allowlists and signed commands. Do not use this helper as an execution gate.
2. **High: legacy end-to-end test hides HTTP failures.**
   tests/total-project-integration.test.ts:250 catches assertions and still prints
   100% PASSED at line 255. This run observed 401 rather than expected 200. The 401
   is consistent with authentication protection; the defect is the test's false
   success reporting and obsolete unauthenticated expectations.
3. **Medium: development dependency advisory.** npm audit reports braces and its
   micromatch/fast-glob/Next ESLint dependency chain as five high entries, not five
   independently demonstrated exploits. Advisory: GHSA-vfj7-8cjw-p6xm, nested-pattern
   stack exhaustion. Production-only audit reports zero. Resolve the toolchain
   compatibly and retest; do not blindly accept a suggested major downgrade.
4. **Medium: empty DPO evaluation reports perfect alignment.**
   ai/src/deep-learning/trajectory-dpo-tuner.ts returns alignmentRatio=1 for zero
   pairs. Reproduced directly. Empty evidence must be unavailable, not 100% quality.
5. **Medium: legacy weights and reviewed checkpoints are separate paths.**
   ai/src/deep-self-trainer.ts:419,500 writes local neural_weights.json from
   synthetic training; ai/src/neural-network.ts:1005 loads a structurally valid
   file without a held-out promotion requirement. The newer reviewed database
   checkpoint path does have gates. Legacy CLI training must not be represented
   as equivalent to a reviewed deployment or external LLM improvement.
6. **Medium: legacy memory is unsuitable as shared tenant memory.**
   cognitive-memory-engine.ts defaults userId to global and semantic recall has
   no tenant argument. Semantic memory persists one local JSON collection.
   Production web chat instead uses scoped ExperienceStore and ConversationStore;
   no active web-chat leakage through this legacy helper was demonstrated.
7. **Medium: seeded graph is not discovered infrastructure.**
   graph-rag.ts defaults to seedProductionTopology and exports a seeded singleton.
   The production diagnostic context correctly uses SystemTopologyGraph(false)
   with database relationships. Legacy graph results must not be labeled live.

## AI capability assessment

| Feature/name | Actual code behavior | Missing or limitation |
| --- | --- | --- |
| Web reasoning | External LLM stream with tenant history, observations and retrieved sources | Configured live provider and representative answer review |
| Personal memory | Explicit scoped database preferences/goals/constraints/corrections with expiry | No records currently; not automatic learning from everything |
| Experience learning | Opt-in collection and independent lesson review; lessons reused as context | No collected events or reviewed lessons in inspected database |
| Reviewed classifier | Reviewed examples, evaluation and gated database checkpoints | No examples, checkpoints or deployments in inspected database |
| Legacy Mem0-style memory | Local maps/JSON, regex fact extraction, hashed 64-dimensional word/trigram vectors | Not a learned semantic encoder or a human brain; unsafe to wire globally |
| Swarm jury | Three deterministic heuristic evaluators and a verdict combiner | Not independent LLM agents conducting a measured debate |
| World model / MCTS | Heuristic scoring and random perturbation/rollouts | Not measured causal predictions or actual sandbox execution |
| Speculative dry run | Regex command analysis and a SHA-256 result hash | No shadow environment; hash does not establish authenticated approval or safety |
| DPO tuner | Computes a scalar loss from supplied log probabilities | No optimizer updates external LLM weights |
| Repository retrieval | Bounded text index plus selected-repository current-commit reads, optional reranking | No complete repository vector/graph understanding; index presently empty |
| Coding agent | Selects at most 10 source files <=20 KB, makes one provider change plan and runs checks | Not whole-repository understanding or an iterative autonomous repair loop |

The production web chat entry point is web/app/api/chat/route.ts; coding enters
services/src/workspace/repository-task.ts; WhatsApp uses its separate authorized
assistant/router. Legacy AGI, cognitive-memory, simulator, swarm and DPO modules
are exported and exercised by other legacy modules/tests, but are not the active
web-chat pipeline. These are disconnected/experimental capabilities, not all
provably dead code. Removing exports requires a separate consumer audit.

Fresh read-only counts were zero for learning_examples, learning_checkpoints,
learning_deployments, experience_events, experience_lessons, personal_memories,
repository_knowledge_files, whatsapp_phone_links and whatsapp_assistant_sessions.
That establishes absence of stored activity in this database, not a code failure.

## Missing configuration and real acceptance

The inspected local runtime lacks a cloud-model credential, PREVIEW_BASE_DOMAIN,
PREVIEW_SIGNING_SECRET, RYVIX_PUBLIC_URL, RYVIX_AGENT_RELEASE_MANIFEST,
RYVIX_WORKSPACE_NODE_IMAGE, RYVIX_WORKSPACE_EGRESS_IMAGE, RYVIX_WORKSPACE_IMAGES,
RYVIX_WORKER_HOST_ID and RYVIX_WORKER_PREVIEW_DOMAINS. Database/auth configuration
exists. These results do not inspect a remote secret store.

- Linux workers, images, preview DNS/TLS and multi-host routing need deployed checks.
- Gmail SMTP needs real OTP/security/deployment inbox receipt verification.
- Gmail OAuth intake is manually polled through POST /api/channels/gmail. No
  scheduled Gmail polling caller was found; Pub/Sub push and replies remain absent.
- Meta needs real OTP, signed incoming message, AI reply, template and receipt tests.
- Website flow needs clone -> changes -> Docker checks -> preview -> approved PR /
  release -> customer CI/CD -> matching deployment webhook -> email acceptance.
- Signed native commands and cloud recovery need a designated live host and approved
  operation, plus independently observed outcomes. No reboot was attempted here.
- Authenticated browser flows and live provider answer quality remain unverified.
- Direct WhatsApp merge/reboot is deliberately not implemented: scoped web approval
  handoffs preserve existing authorization. This is a safety boundary, not a bug.
- Streaming token/currency usage is unavailable; quotas are not measured billing.
- Representative independent labels, held-out evaluation and drift monitoring
  are still required before claiming AI accuracy or continual improvement.

## Loops, security coverage and next work

Reviewed worker loops have stop signals and delays, repository heartbeat has an
overlap guard and cleanup, and inspected provider body readers enforce size bounds.
No unconditional CPU-spin defect was confirmed in those paths. This does not
establish load, crash-recovery or multi-host race safety; those need targeted tests.

Database RLS/backend-only access checks passed. The current tests cover important
authorization paths, but no audit can conclude that all loopholes are absent from
these results. No production exploit was demonstrated in this inspection.

Recommended order: fix the simulator verdict and false-green test; quarantine or
accurately label legacy AI outputs and unify weight governance; resolve development
dependency findings; add authenticated acceptance tests; configure real providers
and run deployment scenarios; then collect reviewed data and evaluate quality.
