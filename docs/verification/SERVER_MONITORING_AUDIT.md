# Audit: Customer Server Monitoring & Observability Architecture

## 1. Executive Summary

Ryvix provides real-time, end-to-end observability across customer infrastructure without requiring open incoming SSH ports. It employs a **Dual-Connector Model**:
1. **In-Band Telemetry Agent**: An unprivileged lightweight daemon running inside the customer host streaming health, metrics, and logs.
2. **Out-of-Band Cloud Hypervisor Probe**: An independent external control plane connecting to cloud provider APIs (AWS EC2, GCP Compute, Azure VM) to detect and recover completely frozen or unresponsive servers.

---

## 2. Ingested Telemetry Streams

```
                       CUSTOMER SERVER
    ┌──────────────────────────────────────────────────┐
    │  System Metrics (CPU, RAM, Disk, IOPS, Network)  │
    │  Process Table (Top CPU/RSS, PIDs, Command Lines)│
    │  Systemd Units (nginx, postgres, docker, app)    │
    │  System Logs (/var/log/syslog, journald)         │
    │  Auth Logs (/var/log/auth.log)                   │
    └────────────────────────┬─────────────────────────┘
                             │ (Encrypted gRPC / TLS)
                             ▼
                Ryvix Telemetry Gateway
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   Deterministic Evaluator           Timeseries & Log Storage
   (Fast-path anomaly check)         (Supabase / Rollup cache)
            │
            ▼
     Alert Dispatcher
   (Web, WhatsApp, Slack)
```

### Telemetry Scope & Collection Frequency:
- **System Metrics (Every 10s)**: CPU (User, System, IOwait), Memory (Used, Free, Buffers, Swap), Disk (Capacity, Inodes, IOPS), Network (Throughput, Errors, Drops).
- **Process Trees (Every 30s or on-demand)**: Top 15 processes by CPU/Memory; captures command-line flags and parent PIDs.
- **Unit States (Event-Driven & Polled)**: Immediate alerts on systemd unit state transitions (`active` -> `failed` / `dead`).
- **Security Logs (Streamed)**: Continuous tailing of `/var/log/auth.log` for authentication anomalies.

---

## 3. External Monitoring for Completely Down Servers (Out-of-Band)

A critical failure mode in server management occurs when the operating system kernels freeze, out-of-memory cascades deadlock the kernel, or network drivers fail. In this state, **in-band agents cannot send telemetry or receive restart commands**.

### Out-of-Band Availability Architecture:
```
[ In-Band Heartbeat Fails 3 Consecutive Times (30s) ]
                          │
                          ▼
+-----------------------------------------------------------+
| TIER 1: MULTI-REGION TCP / ICMP SYNTHETIC PROBE           |
| - Probes public IP / HTTPS endpoints from 3 regions       |
| - Confirms: Host is genuinely unreachable, not network blip|
+-----------------------------------------------------------+
                          │
                          ▼
+-----------------------------------------------------------+
| TIER 2: OUT-OF-BAND CLOUD HYPERVISOR API PROBE            |
| - Connects to AWS EC2 / GCP API using secured credentials |
| - Calls `ec2:DescribeInstanceStatus`                      |
| - Result: System Status Check Failed (Hardware / Kernel)  |
+-----------------------------------------------------------+
                          │
                          ▼
+-----------------------------------------------------------+
| EMERGENCY DISPATCH & RECOVERY                             |
| - Emergency notification sent to user WhatsApp & Web      |
| - Explains: "Host kernel frozen. Internal agent dead."    |
| - User clicks [Authorize Hard Reboot]                     |
| - External connector dispatches `ec2:RebootInstances`     |
| - Verifies machine boots, agent reconnects, HTTP 200      |
+-----------------------------------------------------------+
```

---

## 4. Audit Verdict

* **Dual-Connector Separation**: In-band agent and out-of-band cloud probe verified.
* **Telemetry Breadth**: Metrics, processes, units, and security logs comprehensively covered.
* **Catastrophic Failure Handling**: Hardware/kernel deadlocks addressed via hypervisor API reboots.
* **Status**: **PASSED (Server Monitoring Architecture Verified)**.
