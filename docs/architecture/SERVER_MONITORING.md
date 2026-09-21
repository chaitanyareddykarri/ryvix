# Ryvix Server Monitoring & Health Telemetry Specification

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
