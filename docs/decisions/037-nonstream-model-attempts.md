# ADR 037: Coding and embedding attempt accounting

Extend the existing backend-only ledger with coding, embedding_query and
embedding_index sources. Coding starts require the task creator's current role,
active task and exact worker lease. Index starts require the configured admin and
exact unexpired indexing claim. Query starts require current repository access and
a fresh enabled index with an authorized configuring administrator.

Persist starts before dispatch; failure to record a start prevents dispatch.
Persist completion/failure/cancellation against the original scoped attempt even
after access revocation. Never retry a provider because final ledger writing failed.
Process crashes leave an unknown started record. Prompts and secrets stay out of
the ledger. Missing token counts remain null, including embedding output counts.

Migration 20261005000004 was applied on October 6; all 137 database boundary checks
passed afterward. Chat reranking records embedding attempts under the current
conversation's web scope. Production gateway/embedding callers require an observer,
so legacy unscoped callers cannot silently dispatch unaccounted requests. Production
completion also rejects unavailable providers instead of using synthetic fallback.
Invoice reconciliation remains outside this ledger's coverage. See
[rollout evidence](../verification/ROLLOUT_2026_10_06.md).
