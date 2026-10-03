# ADR-028: Reviewed experience and explicit personal memory

Status: implementation, 2026-10-03.

Ryvix will collect bounded, structured outcome evidence only for opted-in projects.
The worker copies identifiers, measured outcomes and safe numeric summaries, not
credentials, raw logs or entire repositories. Source/version keys make collection
idempotent. Retention removes expired evidence and its dependent lessons. Turning
collection off purges this derived store; authoritative operational records remain.

Chat corrections are explicitly submitted by the conversation owner. They are
claims, never proof that an answer is correct. Independently reviewed project
lessons can be retrieved with provenance and expiry; they cannot authorize tools.
Personal preferences/goals are explicitly editable, expiring, user/organization
scoped memory. They remain separate from shared project lessons and training.

Existing reviewed classifier training remains the only weight-training path.
Experience is not automatically labeled, promoted, or exported to another tenant
or external training provider. Promotion and rollback keep their existing gates.
The legacy global anomaly cache is removed from diagnosis decisions: an unverified
LLM diagnosis must not become a trusted fix or a fabricated confidence score.

The experience worker also records time-window outcome counts for drift review.
These are operational proxies, not causal proof or calibrated model accuracy.
General-purpose LLM fine-tuning needs an explicitly selected compatible provider,
reviewed task-specific datasets and held-out evaluations before implementation of
any provider training submission. No provider training or server action is invoked
by this pipeline.
