# Ryvix Server Monitoring & Health Telemetry Specification

## Implementation checkpoint — 2026-10-03

Code checkpoint: `d81b281`; applied migrations through `20261003000004`.
Implemented: reviewed experience/personal memory, bounded repository indexing,
Gmail SMTP email, WhatsApp OTP identity, opt-in AI replies/history/quotas, confirmed
coding requests, task notifications and authenticated approval handoffs. Releases
and server operations retain their existing web authorization and approval checks.
Recorded verification: 79 project suites plus 15 Node checks, typecheck/lint/build
and 125 database boundary checks passed. Provider delivery, deployed workers/browser
acceptance and representative model accuracy remain unverified.

See [project status](../PROJECT_STATUS.md), [assistant setup](../infrastructure/WHATSAPP_ASSISTANT.md) and
[recorded verification](../verification/WHATSAPP_ASSISTANT_2026_10_03.md). This documentation update did not rerun those
code checks. Detailed designs below may include planned capabilities; the status
index distinguishes implemented behavior from future work.


## 1. Observability Subsystem Scope

Ryvix treats telemetry as a first-class operational subsystem. Rather than operating as an isolated log viewer or metric dashboard, Ryvix correlates infrastructure metrics, system logs, process lifecycle events, and application deployments into a unified timeline for AI-assisted root cause analysis.

---

## 2. Ingested Telemetry Streams

### 2.1 Core System Metrics
Collected at configurable intervals (default: every 10 seconds):
- **CPU**: User, system, iowait, steal, per-core utilization, load averages (1m, 5m, 15m).
- **Memory**: Total, available, used, cached, buffers, swap usage, swap thrashing indicators.
- **Storage**: Disk space per mounted filesystem, inode utilization, read/write IOPS, queue depth.
- **Network**: Bytes sent/received, packet drops, error counts, active TCP connections (ESTABLISHED, TIME_WAIT).

### 2.2 Processes & Services
- **Process Trees**: Snapshot of top resource-consuming processes by CPU and RSS memory.
- **Systemd Units**: Real-time status of critical background units (e.g. `nginx`, `docker`, `postgresql`, `app.service`).
- **Container States**: Metrics for Docker/containerd (container status, restart count, memory limits, CPU throttling).

### 2.3 Log Streams
- **System Logs**: `/var/log/syslog`, `/var/log/messages`, `journald` units.
- **Security & Auth Logs**: `/var/log/auth.log` (failed logins, sudo invocations, SSH sessions).
- **Application Logs**: Standard output and standard error from container workloads and targeted log files.

---

## 3. Data Ingestion & Stream Processing Pipeline

```
[ Internal Connector ]
         │ (High-throughput gRPC / WebSocket over TLS)
         ▼
[ Ryvix Telemetry Ingestion Gateway ]
         │
         ├──> [ Stream Validator & Rate Limiter ]
         │    - Reject malformed payloads
         │    - Token bucket rate-limiting per project
         │
         ├──> [ Fast-Path Anomaly Evaluator ]
         │    - Check deterministic alert rules (CPU > 95%, disk > 90%, auth spikes)
         │    - Emit instant alerts to Redis pub/sub
         │
         ├──> [ Time-Series & Log Storage (PostgreSQL & Object Storage) ]
         │    - Roll up metrics (10s raw -> 1m avg -> 1h rollups)
         │    - Compressed partitioned log chunks
         │
         └──> [ Supabase Realtime Gateway ]
              - Broadcast to active Web Chat & Dashboard sessions
```

---

## 4. Telemetry Correlation for AI Diagnostics

When an alert triggers or a user asks "Why is my server slow?", Ryvix compiles a cross-correlated diagnostic snapshot across four vectors:
1. **Metric Anomalies**: High CPU or memory consumption at time `T`.
2. **Process Outliers**: Identifying the exact process ID and command line generating the load.
3. **Log Exceptions**: Filtering log lines within the time window `[T - 5m, T + 5m]` for `ERROR`, `FATAL`, or `PANIC`.
4. **Recent Deployments**: Checking if a GitHub commit or CI/CD deployment was rolled out within the past 60 minutes.

This correlated snapshot is provided to the AI Model Gateway, allowing it to provide an immediate, context-rich diagnosis (e.g., *"Memory exhaustion caused by leak in v2.4.1 deployment released 15 minutes ago, causing OOM killer to terminate PostgreSQL"*).
