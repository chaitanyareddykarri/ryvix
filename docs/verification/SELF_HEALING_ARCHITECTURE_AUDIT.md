# Audit: Self-Healing & Security Incident Architecture

## 1. Executive Summary

Ryvix combines continuous telemetry observability, deterministic intrusion/failure detection, AI-assisted root-cause forensics, and policy-governed automated recovery. This audit validates that the self-healing architecture:
1. Prevents uncontrolled, autonomous shell execution by the AI.
2. Employs a strict 4-Tier authorization model for remediation actions.
3. Implements deterministic safety circuits (max attempts, cooldowns, timeouts) to eliminate infinite self-healing loops.
4. Generates an immutable, cryptographic audit trail for every investigation and recovery run.

---

## 2. End-to-End Self-Healing Workflow

```
                   Server Telemetry & Logs
                             │
                             ▼
                     Detection Engine
               (Deterministic Rules & Anomaly)
                             │
                             ▼
                     Security Incident
                             │
                             ▼
                 AI Forensic Investigation
              (Correlates Logs, Commits & Metrics)
                             │
                             ▼
                     Policy Evaluation
              (Action Level & Permission Check)
                             │
            ┌────────────────┴────────────────┐
            │                                 │
     Level 0 - 2 (Safe)              Level 3 (High-Impact)
     Auto-Executed / Whitelisted     Explicit Human Authorization Required
            │                                 │
            │                        Interactive Approval Card
            │                        (Web / WhatsApp / Slack)
            │                                 │
            └────────────────┬────────────────┘
                             │
                             ▼
                      Recovery Action
            (In-Band Daemon OR Out-of-Band Cloud API)
                             │
                             ▼
                  Post-Action Verification
                             │
            ┌────────────────┴────────────────┐
            │                                 │
        Recovered                          Failed
            │                                 │
            ▼                                 ▼
      Audit Ledger                  Circuit Breaker & Cooldown
    (status: 'success')                       │
                                              ▼
                                         Escalation
                                    (Notify Human On-Call)
```

---

## 3. Action Authorization Tiers

To prevent autonomous model runaway or destructive interventions, Ryvix enforces a 4-tier action hierarchy:

| Level | Classification | Execution Policy | Permitted Capabilities |
| :--- | :--- | :--- | :--- |
| **Level 0** | **Read-Only Observation** | Always Permitted | Ingest CPU/RAM/Disk metrics, stream application logs, tail `/var/log/auth.log`, inspect process lists (`ps aux`). |
| **Level 1** | **Safe Diagnostics** | Autonomous | Query service status (`systemctl status`), trace system calls (`strace -c`), check listening sockets (`ss -tulpn`), test internal endpoints (`curl http://localhost/health`). |
| **Level 2** | **Low-Risk Remediation** | Automated with Rate Limiting | Truncate unrotated runaway logs filling `/var/log`, drop attacking IP in firewall (`ufw insert 1 deny`), restart idempotent background queue consumer. |
| **Level 3** | **High-Impact Actions** | **MANDATORY HUMAN APPROVAL** | Stopping production services, killing critical processes (`kill -9`), production rollback, database migrations, hardware-level hypervisor reboots (`ec2:RebootInstances`). |

> [!CAUTION]
> **Zero LLM Shell Execution**: The AI Model never receives bash/shell capabilities directly on customer servers. Every action must map to a discrete, whitelisted, parameter-validated capability mediated by the Ryvix Backend.

---

## 4. Anti-Looping & Safety Circuit Breakers

To guarantee that self-healing actions do not cause cascading failures or thrash server resources:

1. **Maximum Recovery Attempts**:
   - A failing service is limited to **maximum 3 restart attempts** within a 15-minute rolling window.
2. **Exponential Backoff & Cooldown**:
   - Attempt 1: Immediate execution upon detection/approval.
   - Attempt 2: 60-second delay.
   - Attempt 3: 300-second delay.
   - Subsequent: Circuit opens; all automated remediation is halted.
3. **Hard Execution Timeouts**:
   - In-band recovery actions: 30-second timeout.
   - Out-of-band cloud reboots: 180-second timeout.
4. **Mandatory Verification**:
   - Every action requires post-execution verification (e.g., verifying `HTTP 200` on health route and CPU `< 60%`).
5. **Immediate Escalation**:
   - If Attempt 3 fails verification, the incident is flagged as `ESCALATED`, all automated retries freeze, and an emergency alert is dispatched to WhatsApp and Web console.

---

## 5. Attack & Threat Detection Architecture

The detection engine correlates signals across kernel logs, auth logs, and application layers:

```
[ Ingest Stream: /var/log/auth.log ]
               │
               ▼
[ 25 Failed SSH attempts within 45s from 198.51.100.4 ]
               │
               ▼
+-----------------------------------------------------------+
| TIER 1: DETERMINISTIC FAST-PATH DETECTION                |
| - Rule: `ssh.brute_force` triggered                      |
| - Severity: HIGH                                          |
| - Creates `security_events` record                        |
+-----------------------------------------------------------+
               │
               ▼
+-----------------------------------------------------------+
| TIER 2: AI FORENSIC CORRELATION                           |
| - Correlates with past firewall drops and IP reputation   |
| - Synthesizes incident card:                              |
|   "Brute-force SSH attack detected targeting root/admin.  |
|    Zero successful logins. Recommending UFW drop rule."   |
+-----------------------------------------------------------+
               │
               ▼
+-----------------------------------------------------------+
| REMEDIATION: Auto-drop via Level 2 rule OR Admin Approval |
| - Dispatches `firewall.deny_ip(198.51.100.4)`             |
| - Verifies socket disconnect                              |
| - Logs action into `public.audit_events`                  |
+-----------------------------------------------------------+
```

---

## 6. Audit Verdict

* **Safety Invariants**: Enforced. Zero arbitrary shell commands in AI.
* **Circuit Breakers**: Defined with max attempts, cooldowns, and escalation.
* **Multi-Tier Authorization**: Compliant with Level 0–3 security hierarchy.
* **Status**: **PASSED (Self-Healing Architecture Verified)**.
