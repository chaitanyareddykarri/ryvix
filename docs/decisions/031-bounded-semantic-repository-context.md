# ADR 031: semantic search and static dependency context

Store optional normalized provider embeddings on the existing protected repository
snapshot rows. Rebuild when the configured model changes. Search only authorized,
fresh snapshots; recheck authorization after provider work before returning data.
The existing 100-file/1 MB snapshot limits and partial flag remain authoritative.
Embeddings cover bounded file excerpts, not every token of large repositories.

Static dependency references are derived from those same authorized files. Edges
must resolve to another file in the snapshot, never external paths or another tenant.
These text parsers do not establish runtime dependencies or compiler symbol truth.
Vector ranking uses a bounded exact scan, not a separate vector database. If provider
access fails, lexical search remains available. No embedding is sent without the
operator feature flag and the existing repository indexing opt-in.
