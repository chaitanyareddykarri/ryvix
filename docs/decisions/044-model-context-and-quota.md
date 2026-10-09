# ADR 044: Bounded context and durable quota retry

Gateway history compaction is deterministic and extractive. Preserve system
instructions and the latest request byte-for-byte; fail explicitly if those alone
exceed the configured character budget. Older content can be omitted. This is not
token-exact model sizing or a semantic summary, and does not compact source files
inside a single coding request.

When every selected provider is cooling down, return a typed quota error.
Only pre-plan coding jobs can be deferred, after sandbox termination, with at
most three retries and no wait exceeding a day. Persist the available time in
the job table. Existing claim, membership, credential and lease checks still apply.
Never automatically retry a shipped change, partial stream or uncertain operation.
Interactive chat still requires a user retry; this queue is for coding jobs.
