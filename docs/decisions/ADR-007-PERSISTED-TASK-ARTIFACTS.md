# ADR-007: Persist repository task artifacts before approval

Tasks currently persist their prompt but lose generated code and workspace results.
The dashboard cannot reconstruct a diff from a prompt or a task identifier.

Add an incremental `task_artifacts` table, keyed by task, holding the repository,
base commit, actual changed files, plan and verification results. The existing
workspace manager supplies measured diffs; the existing PR service publishes
those exact files. Browser clients receive read access through membership RLS;
only backend workers may write artifacts. A generated patch is immutable after
approval. PR metadata includes the actual commit SHA and one PR per task.

Authorization must join persisted membership and the task's project. A client
cannot write an artifact, approve a different tenant's task, or substitute files
in the shipping request. Base revision changes require regeneration/review.

This extends existing tables and engines; it does not replace the GitHub or
Docker architecture. Live rollout requires applying the numbered migration.

The same migration grants membership-scoped SELECT access to health checks and
security events, whose original migration enabled RLS without read policies.
