# ADR-019: Scoped conversation history and grounded streaming

Store completed question/answer pairs in PostgreSQL under organization and user
ownership. Backend transactions recheck current membership and lease a conversation
for one response; browsers cannot write conversation tables directly. Only completed
answers enter history. Failure/cancellation releases the lease and discards partial
answers. History is bounded to 12 pairs/24000 characters for model input and 100
pairs per conversation at persistence. Oversized earlier questions/answers are
explicitly truncated to fit the history budget. Membership row locking serializes
lease acquisition across replicas; one active conversation per user/organization
and at most 60 new conversations per hour are allowed.
Older-than-30-day turns are pruned on access.
This is not a background global retention guarantee.

Retrieve bounded relevant incident and repository artifact excerpts through the same
tenant boundary. Artifact contents represent a recorded task snapshot, not the current
GitHub branch. Never search the control-plane filesystem for customer context.
Model context is untrusted data, sanitized before provider transmission. Excerpts
carry source IDs and dates. No retrieved instruction may authorize an operation.

Use native provider streaming via the existing model gateway; fail over only before
the first visible text. Missing usage stays unavailable. No synthetic streaming or
deterministic substitute answer is allowed. Provider and browser cancellation must
release resources. This ADR does not enable operational execution.
