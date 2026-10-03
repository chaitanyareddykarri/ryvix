# Repository knowledge

Implemented 2026-10-03 with `20261003000002_repository_knowledge.sql`.
Open `/knowledge` from Chat. An owner/admin can enable indexing for a connected
repository, queue a refresh, or disable and erase its stored index. Collection of
operational experience is a separate opt-in.

## Deployment

Apply the migration and deploy matching web/backend/experience-worker code.
Add `RYVIX_REPOSITORY_KNOWLEDGE_ENABLED=true` to the experience worker's existing
environment. Its verified-TLS database connection resolves the project's active
GitHub OAuth credential from Vault. The host needs outbound HTTPS to GitHub.
No additional LLM or vector-database provider is needed for indexing.

Run `npm run worker:experience -- --once` for a startup check, then run the supplied
`infrastructure/ryvix-experience.service`. Opt-in does not start a worker.
The worker attempts one repository per iteration; eligible repositories are checked
at least ten minutes apart unless an admin explicitly queues a refresh. Actual
refresh delay increases with repository count and GitHub response time. UI changes
have a durable 30-per-user-per-organization hourly budget.

## Scope and boundaries

- Stores at most 100 supported text files, 32 KiB per file and 1 MiB per repository.
  Hidden paths, dependency/build directories, credential paths, lockfiles, binary
  extensions and symlinks are excluded. Known secrets are sanitized; this is not
  a guarantee of detecting every secret embedded in source.
- Reads a pinned Git commit through bounded GitHub API responses; no code executes.
  Durable claims expire after three minutes. Publication rechecks claim ownership,
  opt-in, repository mapping and the configuring administrator's current role.
- PostgreSQL full-text search returns at most six snippets. Access is tenant-scoped
  and rechecks both the requesting member and configuring administrator. These are
  searchable source snapshots, not a full semantic vector index or model training.
- General chat labels indexed commit/time and does not claim current-branch access.
  Selected-repository chat checks GitHub's current commit before using a matching
  snapshot; otherwise its existing bounded live-file retrieval remains available.
  Snapshots older than 24 hours and unavailable/indexing snapshots are not served.
- Disabling deletes indexed files. Prior chat messages are not rewritten. Both
  index tables have RLS and deny direct browser privileges.

Partial coverage is shown explicitly. Even an index within these bounds excludes
unsupported files and cannot establish complete repository understanding.

## Verification

`npm run verify:experience` uses real SQL rollback fixtures and an injected GitHub
reader to check isolation, sanitized storage, commit mismatch, stale snapshots,
revoked membership and cancellation during publication. Unit tests cover bounded
GitHub reads, symlink exclusion and unchanged-commit reuse. This does not certify
a deployed worker, real GitHub indexing or authenticated browser acceptance.

See [the October 3 checkpoint](../verification/EXPERIENCE_2026_10_03.md) and
[experience deployment](EXPERIENCE_AND_MEMORY.md).
