# Gate 3: Connector Architecture Audit & Capability Model

## 1. Executive Summary

Ryvix interacts with diverse external systems: source control (GitHub), messaging channels (WhatsApp, Gmail), customer servers (in-host agent), and cloud infrastructure providers (AWS, DigitalOcean, Hetzner). 

To prevent scattered, ad-hoc API calls inside the AI reasoning loop, all external systems must be governed by a unified **Connector Capability Architecture**:

```
Connector (Target System Bridge)
   │
   ▼
Capabilities (Declared Actions: e.g. `repo.create_pr`, `server.restart`)
   │
   ▼
Tools (Typed Schemas exposed to AI reasoning)
   │
   ▼
Permissions (Project RBAC & Approval Tier checks)
   │
   ▼
Backend Authorization Gate (Evaluated before dispatch)
   │
   ▼
Execution (Worker / Connector Bridge with scoped ephemeral token)
   │
   ▼
Immutable Audit Ledger (`audit_events` in Supabase)
```

---

## 2. Current Connector State & Missing Abstractions

### Current State:
* **Internal vs. External Connector**: Architecture fully separated in [`docs/architecture/CONNECTOR_ARCHITECTURE.md`](../architecture/CONNECTOR_ARCHITECTURE.md).
* **Database Models**: `ServerConnector` and `ConnectorPermission` types declared in [`packages/database/src/types.ts`](../../packages/database/src/types.ts).
* **AI Separation**: The AI layer contains zero connector clients or raw credentials.

### Missing Abstraction (Scheduled for Phase 6):
* **Canonical `BaseConnector` Interface**: A standardized TypeScript/Python abstract class that all connectors implement:
  ```typescript
  interface BaseConnector {
    id: string;
    type: 'github' | 'gmail' | 'whatsapp' | 'internal_server' | 'external_cloud';
    getCapabilities(): CapabilityManifest[];
    validateHealth(): Promise<HealthStatus>;
    execute(action: string, params: unknown, context: SecurityContext): Promise<ExecutionResult>;
  }
  ```

---

## 3. Capability Model by External System

### 3.1 GitHub Connector (`docs/integrations/GITHUB.md`)
* `repo.read_tree`: List directories and file trees (Tier 1 - Read-Only).
* `repo.read_file`: Fetch file contents (Tier 1 - Read-Only).
* `repo.create_branch`: Provision feature branch (Tier 2 - Ephemeral).
* `repo.commit_diff`: Apply verified modifications (Tier 3 - Approval Required).
* `repo.create_pr`: Open Pull Request with preview link (Tier 3 - Approval Required).

### 3.2 Internal Server Connector (`docs/integrations/INTERNAL_CONNECTOR.md`)
* `telemetry.stream`: Push CPU, memory, disk, network, container stats (Continuous).
* `logs.tail`: Stream systemd journal and application logs (Continuous).
* `service.restart`: Cycle whitelisted systemd unit (Tier 4 - Approval Required).
* `container.restart`: Restart specific Docker container ID (Tier 4 - Approval Required).

### 3.3 External Out-of-Band Connector (`docs/integrations/EXTERNAL_CONNECTOR.md`)
* `probe.synthetic`: Multi-region HTTP/TCP health check (Continuous).
* `cloud.instance_status`: Query cloud hypervisor state (Tier 1 - Read-Only).
* `cloud.emergency_reboot`: Trigger ACPI hard reboot via cloud API (Tier 5 - Emergency Approval).

### 3.4 WhatsApp & Gmail Connectors (`docs/integrations/WHATSAPP.md`, `GMAIL.md`)
* `comm.send_alert`: Dispatch incident card with interactive buttons (Tier 1).
* `comm.receive_command`: Ingest user text and map to authenticated project user (Tier 1).

---

## 4. Credential & Secret Storage Boundaries

* **No Secrets in AI Context**: The AI model only receives abstract resource IDs (e.g. `server_id: "srv_982a"`, `repo_id: "repo_41b"`).
* **KMS Vault Storage**: Cloud provider tokens and private keys reside in encrypted database tables (`credentials_vault`).
* **Ephemeral Worker Injection**: Credentials are decrypted strictly within the ephemeral worker process executing the connector action and destroyed immediately upon task completion.

---

## 5. Audit Requirements

Every connector invocation automatically emits an append-only entry to `audit_events`:
* `actor_type`: `'ai'` | `'user'` | `'system'`
* `action_name`: The exact capability invoked (e.g., `github.create_pull_request`)
* `parameters_hash`: SHA-256 hash of tool parameters
* `diff_summary`: Summary of modifications or operational impact
* `status`: `'success'` | `'failure'` | `'rejected'`
