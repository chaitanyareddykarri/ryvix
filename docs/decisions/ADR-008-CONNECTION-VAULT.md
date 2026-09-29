# ADR-008: Persist connection secrets through Supabase Vault

Reuse connectors and connector_credentials. Store a Supabase Vault UUID reference
in vault_secret_ref. GET returns safe metadata. Mutation authorization joins the
environment, project and persisted membership. Secret rotation and revocation
are transactional with the connector update and audit record.

GitHub tokens are verified against GitHub before persistence. Other connector
types use their dedicated OAuth, webhook or enrollment protocol; generic POST
rejects these types rather than claiming an active integration. PATCH supports
metadata updates and GitHub token rotation; DELETE revokes persisted connections.

Deployment requires Supabase Vault and restricted grants. Missing Vault is a
configuration error; there is no plaintext fallback. Backend-only SQL accesses
Vault; credentials and Vault references never appear in API responses.

Migration 20260929000001 installs Vault if absent and revokes browser mutation
grants on connectors and all browser access to connector credentials and Vault.
The authenticated backend uses the existing server-only PostgreSQL pool.

Reference: https://supabase.com/docs/guides/database/vault
