# Ryvix Credential Management & Vaulting Specification

## 1. Zero-Credential Exposure to AI

Under no circumstance are raw credentials passed into the AI Model's prompt context, system instructions, or tool arguments.

When the AI reasons about external systems:
- It references abstract entity IDs (e.g. `repo_98f12`, `server_us_east_01`).
- The Backend resolves the required secret from encrypted storage immediately prior to executing the tool in a secure worker.
- The secret is consumed in-memory and immediately destroyed.

---

## 2. Secret Storage & Encryption Hierarchy

- **Data at Rest**: All customer credentials (cloud provider tokens, OAuth refresh tokens, connector private keys) are encrypted in the `credentials_vault` table using **Envelope Encryption**:
  - **Data Encryption Key (DEK)**: Unique 256-bit AES-GCM key generated per customer organization.
  - **Key Encryption Key (KEK)**: Root master key managed inside cloud KMS (AWS KMS or HashiCorp Vault).
- **In-Memory Lifetimes**: Decrypted secrets are kept only in transient memory within the execution worker process and are never written to disk or logs.
- **Short-Lived Tokens**: Where possible, Ryvix uses short-lived tokens:
  - GitHub App: 60-minute scoped installation tokens.
  - Supabase Auth: 60-minute JWTs with secure HTTP-only refresh cookies.
  - Internal Connector: Signed ed25519 challenge-response sessions with 15-minute token rotation.
