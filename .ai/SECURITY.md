# Ryvix Security Architecture & Operational Invariants

## Implementation checkpoint — 2026-10-02

Settings authorization and mutation share a locked transaction. GitHub execution
uses project-scoped Vault credentials and chat usage has durable quotas. Signed
agent security reports persist measured observations; opted-in users can receive
Resend emails at their confirmed account address. A trusted detector must supply
reports; this does not install a WAF. Server actions and releases require their
explicit persisted approval workflows.

See the [current project status](../docs/PROJECT_STATUS.md) for the
implemented scope, migration checkpoint, verification evidence and remaining work.
The specification below also includes target design; it is not evidence that
every described capability is implemented or live-verified.


## 1. Zero-Trust AI Credential & Database Isolation

The AI Model is strictly an untrusted execution agent with respect to credentials and direct database access. Under no circumstances should secrets or master database keys be included in prompts, context windows, model completions, or AI execution environments.

**Key Invariant**: AI components must never receive unrestricted Supabase service-role/database credentials. Database operations initiated by AI must pass through controlled Ryvix tools/services and authorization.

```
+-----------------------------------------------------------+
|                        AI Model                           |
|        - Sees abstract resource IDs (e.g. repo_123)       |
|        - Emits structured tool calls (e.g. read_file)     |
|        - NEVER receives private keys, tokens, or passwords|
|        - NEVER receives direct database connections/roles |
+-----------------------------------------------------------+
                             |
                             v
+-----------------------------------------------------------+
|                     Ryvix Backend                         |
|   1. Authenticates session                                |
|   2. Validates user permission for target resource        |
|   3. Resolves secret from encrypted vault                 |
|   4. Injects secret only into downstream connector/worker |
+-----------------------------------------------------------+
                             |
                             v
+-----------------------------------------------------------+
|              Target System (GitHub / Server)              |
+-----------------------------------------------------------+
```

---

## 2. Connector Security Invariants

### Internal Connector
- **Privilege Boundary**: Runs as a non-root unprivileged service account (e.g., `ryvix-agent`) where possible.
- **Mutual TLS / Signed Handshake**: Communicates with Ryvix ingestion endpoints over Ed25519 signed requests with nonce replay protection.
- **Bounded Capabilities**: The internal connector only executes commands explicitly whitelisted in its capability manifest (e.g., `restart_service`, `fetch_logs`, `check_disk`). Arbitrary raw bash commands are rejected.

### External Connector (Out-of-Band)
- **Zero In-Host Dependencies**: Operates entirely outside the target server (e.g., via AWS EC2, DigitalOcean, or Hetzner API).
- **Narrow Scopes**: Cloud provider API credentials granted by the customer are strictly scoped to specific instance IDs with actions restricted to the implemented reboot/status workflow.

---

## 3. Human-in-the-Loop Approval Matrix

Every operation in Ryvix is categorized into an approval tier:

| Action Category | Examples | Approval Required? |
| :--- | :--- | :--- |
| **Tier 1: Read-Only** | Reading logs, fetching metrics, analyzing AST, querying repo files | **No** (Auto-executed) |
| **Tier 2: Ephemeral Preview** | Branch clone in isolated workspace, running test suite, rendering frontend preview | **No** (Auto-executed in sandbox) |
| **Tier 3: Destructive / Code Write** | Opening PR, committing to repo, pushing to branch | **Yes** (Customer confirmation required) |
| **Tier 4: Server Operational Action** | Service restart, container restart, process termination | **Yes** (Customer confirmation required) |
| **Tier 5: Infrastructure Recovery** | Out-of-band hard reboot, instance power cycle | **Yes** (Explicit customer emergency approval) |

---

## 4. Attack Detection vs. AI Investigation

1. **Deterministic Rule Engine (Layer 1)**:
   - Evaluates high-frequency telemetry using deterministic thresholds and signature heuristics (e.g., >20 failed SSH logins in 60s, unexpected process spawning in `/tmp`).
   - Flags security anomalies and generates an `incident_record` without AI latency.

2. **AI Forensics & Investigation (Layer 2)**:
   - Triggered by incident records. AI reviews historical logs, recent deployments, and metric spikes to synthesize an executive explanation and remediation plan.
   - AI remediation recommendations **never** execute automatically without human verification and authorization.

---

## 5. Audit Trail Immutability

- Every action generates an append-only record in the `audit_events` table in PostgreSQL.
- Recorded fields: `id`, `timestamp`, `project_id`, `user_id`, `actor_type` (`user` | `ai` | `system`), `action_name`, `parameters_hash`, `diff_summary`, `status`, and `ip_address`.
- Direct updates and deletions on `audit_events` are revoked via PostgreSQL table permissions and RLS policies.
