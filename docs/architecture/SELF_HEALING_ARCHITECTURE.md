# Ryvix Self-Healing, Attack Detection & Autonomous Recovery Architecture

## 1. Executive Summary

Ryvix is an **Autonomous Software & Infrastructure Operations Platform**. Beyond code editing and build verification, Ryvix functions as an autonomous Site Reliability Engineer (SRE) and Security Operations Center (SOC) assistant. It continuously:
1. Ingests high-frequency metrics, system logs, process trees, and kernel security events.
2. Identifies attacks (brute force, credential stuffing, privilege escalation, cryptominers) and infrastructure anomalies (CPU/RAM thrashing, deadlocks, crashed units).
3. Correlates runtime failures with recent source code changes and deployment diffs.
4. Formulates deterministic, multi-level recovery plans.
5. Gates destructive actions behind strict Human-in-the-Loop authorization.
6. Executes authorized remediations (service restarts, log truncations, IP firewall drops, hypervisor reboots).
7. Verifies post-recovery system health and logs the complete chain of custody to an immutable audit ledger.

---

## 2. End-to-End Autonomous Detection & Recovery Pipeline

```
                              CUSTOMER SERVER
                 ┌──────────────────────────────────────┐
                 │  - System Metrics (CPU/RAM/IOPS)     │
                 │  - System Logs (/var/log/syslog)     │
                 │  - Auth Logs (/var/log/auth.log)     │
                 │  - Process Trees & systemd Units     │
                 └──────────────────┬───────────────────┘
                                    │ (In-Band gRPC/TLS)
                                    ▼
                      TELEMETRY INGESTION GATEWAY
                                    │
                                    ▼
                         DETECTION ENGINE (TIER 1)
                  Deterministic Rules & Stream Matchers
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
           Normal Baseline                    Anomaly / Attack Detected
                 │                                     │
                 ▼                                     ▼
            Store Rollups                    INCIDENT TRIGGER CREATED
                                                       │
                                                       ▼
                                            DIAGNOSIS ENGINE (TIER 2)
                                             AI Forensic Correlator
                                                       │
                       ┌───────────────────────────────┴───────────────────────────────┐
                       │                                                               │
             Code Regression?                                                Infrastructure Fault?
       (Correlate with Git Commits)                                         (Process / Resource / Attack)
                       │                                                               │
                       ▼                                                               ▼
        [Propose Rollback / Hotfix PR]                                   [Formulate Target Recovery Plan]
                                                       │
                                                       ▼
                                            RECOVERY PLAN FORMULATION
                                                       │
                                                       ▼
                                            AUTHORIZATION GATEWAY
                                        (RBAC & Human Approval Gate)
                                                       │
                           ┌───────────────────────────┴───────────────────────────┐
                           │                                                       │
                     Low-Risk Diagnostic                                Destructive Action
                     (Auto-Approved)                                  (Requires Human Approval)
                           │                                                       │
                           │                                           Card to Web / WhatsApp / Slack
                           │                                                       │
                           ▼                                                       ▼
                      EXECUTE                                          USER APPROVES
                           │                                                       │
                           └───────────────────────────┬───────────────────────────┘
                                                       │
                                                       ▼
                                                EXECUTION ENGINE
                                   (In-Host Daemon OR Out-of-Band Cloud API)
                                                       │
                                                       ▼
                                            POST-RECOVERY VERIFICATION
                                                       │
                                     ┌─────────────────┴─────────────────┐
                                     │                                   │
                                 SUCCESS                              FAILURE
                                     │                                   │
                                     ▼                                   ▼
                              AUDIT LEDGER                      ESCALATE TO ON-CALL
                          (Immutable Event Log)                   (WhatsApp / Pager)
```

---

## 3. Attack & Incident Detection Categories

Ryvix uses a hybrid detection strategy: **Deterministic rule matchers (Tier 1)** handle high-frequency events, while **AI context agents (Tier 2)** handle deep root-cause correlation.

| Threat / Anomaly Pattern | Ingestion Source | Detection Trigger (Tier 1) | AI Forensic Context (Tier 2) |
| :--- | :--- | :--- | :--- |
| **SSH Brute Force** | `/var/log/auth.log` | >20 failed attempts from single IP in 60s | Geolocates ASN, scans past firewall logs, assesses targeted usernames |
| **Credential Stuffing** | Nginx / App Logs | >50 HTTP 401/403 responses across varying usernames in 120s | Isolates target endpoints, flags potential credential leaks |
| **Privilege Escalation** | Kernel audit / sudo logs | Unauthorized `sudo su` or additions to `/etc/sudoers` | Checks active user session and maps process tree back to parent PID |
| **Cryptominers / Malicious Code** | Process tree analyzer | Known signatures (`xmrig`) or processes running from `/tmp` / `/dev/shm` | Analyzes parent binary, network sockets, and process arguments |
| **Resource Starvation (OOM / CPU)** | System metrics | CPU or RAM >98% for >5 consecutive minutes | Identifies top consuming PIDs, stack traces, and memory allocations |
| **Deployment Anomaly** | Telemetry correlation | >500% error rate spike within 15m of a git deployment | Identifies recent commits, failing routes, and error stack traces |
| **Kernel Freeze / Unresponsive Host** | External probe | Internal daemon fails 3 consecutive heartbeats (30s) | Queries AWS EC2 / GCP API hypervisor status checks |

---

## 4. Multi-Tier Remediation & Recovery Strategy

Recovery actions are categorized into progressive tiers of intervention:

### Tier 1: Non-Destructive Diagnostics (Auto-Approved)
- Collect full process trees (`ps aux --sort=-%cpu`).
- Tail recent error logs (`journalctl -u app.service -n 100 --no-pager`).
- Query network sockets (`ss -tulpn`).
- Trace system calls on failing process (`strace -p <pid> -c`).

### Tier 2: In-Band Soft Remediation (Requires Approval for Production)
- **Service Restart**: Issue `systemctl restart <unit>` with automatic post-restart health check.
- **Log Truncation**: Safely truncate unrotated runaway log files filling disk partitions (e.g. `nginx/access.log`).
- **Firewall IP Drop**: Issue `ufw insert 1 deny from <attacker_ip>` to halt brute force attacks.
- **Cache Eviction**: Clear Redis keys or application caches when memory pressure threatens OOM crash.

### Tier 3: In-Band Process Isolation
- Gracefully stop hung child workers (`SIGTERM`).
- Force kill runaway zombie or miner processes (`SIGKILL`).
- Drain traffic from unhealthy application instances.

### Tier 4: Out-of-Band Cloud Hypervisor Recovery
- If the internal agent stops responding due to kernel panic or deadlocked I/O, Ryvix activates its **External Cloud Connector**:
  - Authenticates to AWS/GCP/Azure via out-of-band credentials.
  - Queries hypervisor health checks (`ec2:DescribeInstanceStatus`).
  - Upon high-priority user approval, executes hardware-level reboot (`ec2:RebootInstances`).
  - Verifies host boots back up and in-band agent reconnects.

---

## 5. Human-in-the-Loop Approval Model

No destructive operational action is executed silently.

```
[ Incident: High CPU & Memory Saturation on prod-app-01 ]
                      │
                      ▼
[ Ryvix AI Synthesizes Incident Card ]
- Problem: worker.py consuming 198% CPU (Infinite loop in batch job #482)
- Proposed Action: Kill PID 38192 & Restart 'ryvix-worker.service'
- Risk Assessment: Low (Idempotent job queue)
                      │
                      ▼
[ Dispatch Approval Card via Multi-Channel Connectors ]
  ├── Web Console: Modal with [Approve] / [Reject] buttons
  └── WhatsApp: Interactive button message with quick actions
                      │
                      ▼
[ Admin clicks 'Approve' ]
                      │
                      ▼
[ Backend verifies token, logs actor to audit_events, executes capability ]
```

---

## 6. Audit & Accountability Invariants

1. **Every Tool Call is Logged**: Every diagnosis query, service restart, and IP block is recorded in `public.audit_events`.
2. **Cryptographic Parameter Hash**: Input arguments are hashed (`parameters_hash`) to ensure non-repudiation.
3. **Immutability Enforced**: The database revokes `UPDATE` and `DELETE` on `audit_events`.
4. **State Verification**: Every recovery action must be followed by a verification check (e.g. verifying CPU dropped below 50% or unit returned to active state).
