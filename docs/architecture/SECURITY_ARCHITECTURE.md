# Ryvix Security Architecture & Defense-in-Depth Specification

## 1. Security Principles & Architecture Philosophy

Ryvix operates on five core security principles:
1. **Least Privilege & Zero-Trust**: Components only hold the minimum permissions necessary to perform their immediate task.
2. **Strict Credential Air-Gapping**: Raw credentials, private keys, and database connection strings are never disclosed to the AI model or client-side code.
3. **Deterministic Detection First**: High-frequency security events and attack vectors are detected using deterministic rules, with AI reserved for deep forensic investigation.
4. **Human-in-the-Loop Safeguards**: Destructive actions, production deployments, and cloud infrastructure resets require explicit, authenticated human approvals.
5. **Tamper-Evident Audit Logging**: Every operational change is recorded in an append-only, immutable audit trail.

---

## 2. Threat Vector Isolation & Credential Vaulting

```
[ AI Model (Untrusted for Credentials) ]
           │ (Emits Abstract Tool Names: `git.commit(repo_id, branch, files)`)
           ▼
[ Ryvix Backend Policy & Permission Engine ]
           │
           ├── 1. Validates User Session & RBAC Scopes
           ├── 2. Evaluates Policy Gate (Is Approval Required?)
           ├── 3. Retrieves Encrypted Secret from KMS-backed Vault
           └── 4. Dispatches to Downstream Worker with Ephemeral Token
           │
           ▼
[ Downstream Worker / Connector ] ──> Performs Operation ──> Destroys Token
```

- **Encryption at Rest**: Customer cloud tokens and SSH credentials are encrypted using AES-256-GCM with keys managed via AWS KMS or HashiCorp Vault.
- **Short-Lived Installation Tokens**: GitHub operations utilize installation access tokens valid for at most 60 minutes, generated dynamically per task.

---

## 3. Attack Detection Architecture

Ryvix avoids relying on AI models for low-latency attack detection. Instead, it utilizes a two-tier hybrid architecture:

```
[ Ingested Telemetry (Logs, Metrics, Auth Events) ]
                      │
                      ▼
+-----------------------------------------------------------+
|               Tier 1: Deterministic Engine                |
|  - Rate-based anomaly detection (SSH brute force)         |
|  - Known signature matches (credential stuffing patterns) |
|  - Abnormal process spawning (/tmp execution, crypto-miner|
|  - Resource exhaustion thresholds (CPU > 98% for 5 mins)  |
+-----------------------------------------------------------+
                      │
                      ├─ [ Threshold Breached ]
                      ▼
+-----------------------------------------------------------+
|               Tier 2: AI Forensic Investigation           |
|  - Ingests recent log lines, process trees, deploy events |
|  - Analyzes attacker IP origins and affected accounts     |
|  - Formulates structured Root Cause & Incident Timeline   |
|  - Generates Remediation Recommendations for Admin        |
+-----------------------------------------------------------+
                      │
                      ▼
+-----------------------------------------------------------+
|               Human-in-the-Loop Remediation               |
|  - Urgent alert sent via WhatsApp / Web Chat              |
|  - Customer clicks to authorize IP block or service cycle |
+-----------------------------------------------------------+
```

---

## 4. Connector Security & Communication Integrity

- **Inbound Attack Surface**: The Internal Connector accepts **no inbound network connections**. It initiates an outbound TLS 1.3 connection to the Ryvix Telemetry Gateway.
- **Message Signing**: Telemetry payloads and command instructions are signed with ed25519 cryptographic keys with sequential nonces to prevent replay attacks.
- **Whitelisted Capabilities**: Commands dispatched to internal agents are restricted to predetermined capability schemas; arbitrary raw bash or PowerShell injection is strictly rejected.
