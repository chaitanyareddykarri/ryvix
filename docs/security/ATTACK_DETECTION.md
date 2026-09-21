# Ryvix Security Event & Attack Detection Specification

## 1. Detection Philosophy

Attack detection in Ryvix strictly avoids relying on generative LLMs as the frontline alert detector. Generative models have non-deterministic response times and may hallucinate or miss high-frequency threshold violations.

Instead, Ryvix implements a **two-tier architecture**:
1. **Tier 1: Deterministic Engine**: Fast-path rules and statistical anomaly detectors operating on the live telemetry stream.
2. **Tier 2: AI Investigation**: Deep-context contextualization, correlation with recent git deployments, and human-readable explanation generation.

---

## 2. Detected Attack & Anomaly Patterns

| Pattern Category | Detection Mechanism | Trigger Threshold |
| :--- | :--- | :--- |
| **SSH Brute-Force** | Telemetry Gateway rule on `/var/log/auth.log` | >20 failed authentication attempts from a single IP within 60s. |
| **Credential Stuffing** | Application log pattern matcher | High volume of HTTP 401/403 responses across diverse usernames within 120s. |
| **Privilege Escalation** | Kernel audit / sudo watcher | Execution of `sudo su` or unauthorized additions to `/etc/sudoers`. |
| **Suspicious Processes** | Process tree analyzer | Known cryptominer signatures (`xmrig`), processes running from `/tmp` or `/dev/shm`. |
| **Abnormal Network Traffic**| Network socket monitor | New outbound connections to known malicious C2 IP ranges or high-volume UDP bursts. |
| **Resource Exhaustion** | Metric timeseries threshold | Sustained CPU or RAM utilization >98% for >5 consecutive minutes without corresponding load increase. |
| **Deployment Anomaly** | Telemetry correlation | 500% surge in error rates within 15 minutes of a newly merged Pull Request. |

---

## 3. The Investigation & Response Pipeline

```
[ Telemetry Event: 35 Failed SSH Logins in 30 Seconds from 198.51.100.4 ]
                              │
                              ▼
+-----------------------------------------------------------+
|              Deterministic Alert Rule Triggered           |
|  - Creates `security_events` record                       |
|  - Marks Severity: HIGH                                   |
|  - Compiles Evidence Snapshot: Timestamps, IP, usernames  |
+-----------------------------------------------------------+
                              │
                              ▼
+-----------------------------------------------------------+
|               AI Forensic Investigation Agent             |
|  - Correlates with historical firewall logs               |
|  - Identifies attacker ASN and target system accounts     |
|  - Formulates Plain-English Threat Assessment:            |
|    "Brute force SSH attack targeting 'ubuntu' and 'root'. |
|     No successful logins observed. IP origin: AS1234."    |
|  - Drafts Remediation Recommendation:                     |
|    "Add 198.51.100.4 to UFW firewall drop list."          |
+-----------------------------------------------------------+
                              │
                              ▼
+-----------------------------------------------------------+
|            Human Approval & Controlled Response           |
|  - Sends high-priority card to WhatsApp & Web Console     |
|  - Admin clicks: [Authorize IP Block]                     |
|  - Connector executes UFW drop rule; verifies block       |
+-----------------------------------------------------------+
```
