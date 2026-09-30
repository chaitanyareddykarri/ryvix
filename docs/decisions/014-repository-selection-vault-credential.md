# ADR-014: Persist GitHub credentials at repository selection

Status: implemented locally; live database/provider verification pending.

OAuth callbacks do not know which project the customer will select. Repository
selection is the point where the existing OAuth/PAT session credential becomes a
project-scoped connector credential in Supabase Vault. Repository, environment,
connector, credential and audit changes commit together or roll back together.
The worker continues using the existing project credential lookup.
OAuth and PAT flows no longer insert GitHub user IDs into the App installation
table. A user account is not an installation; those writes also used the wrong
unique key and account-type casing for the schema. Browsing/analysis require a
verified tenant session, and establishing a PAT session requires operator access.

The backend verifies repository metadata and branch with GitHub, rechecks persisted
operator membership, and uses the schema's `(project_id, github_repo_id)` unique key.
Browser-supplied analysis and commands are not persisted as verified facts. Workers
perform their own stack detection. New repositories get a dedicated development
project; existing single-repository projects are reused. An ambiguous repository
mapping or shared multi-repository project returns 409 rather than replacing a
credential used by unrelated repositories. Such projects retain the existing
Connections credential-management flow; per-repository credential bindings remain
a future schema change.

The wizard reports success only after persistence succeeds and passes the database
repository UUID to its parent. Progress reflects completed requests, not timers.
Optional server enrollment uses the existing ConnectServerModal instead of a
second, unauthenticated enrollment flow with a fabricated installer URL.

Tests use explicit GitHub/database adapters to verify denial, rollback and secret
boundaries. They do not certify live Vault SQL, OAuth configuration or RLS policies.
