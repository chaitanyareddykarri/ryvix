# ADR-029: Opt-in repository knowledge snapshots

Repository indexing is separate from experience collection. An owner/admin opts
in an authorized connected repository. A trusted worker resolves its existing
project-scoped Vault credential, reads a pinned GitHub commit and stores bounded,
sanitized text snapshots. No repository content enters another tenant's index.

Snapshots are published atomically after rechecking the configuration, worker
claim and configuring administrator's current membership. Revocation/disable
prevents publication and retrieval. Disable removes the derived files. Expired
snapshots are unavailable. No code executes during indexing.

General chat labels results as indexed snapshots. When a repository is explicitly
selected, retrieval must match the freshly verified commit before it can replace
the existing bounded live-file fallback. File/byte limits and truncated trees are
reported; indexing never implies complete coverage of an arbitrarily large repo.
Credentials, environment files, symlinks, binary assets and dependency directories
are excluded. The feature does not send content to an external training service.
