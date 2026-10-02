# Internal Connector Daemon Specification

## Implementation checkpoint — 2026-10-02

Native service restart and cloud reboot now have separate persisted independent
approvals, cooldowns and recorded outcomes. Native commands use Ed25519 signatures
and a durable Linux replay journal. Cloud dispatch is claimed before provider
contact and ambiguous outcomes are not automatically retried. `/operations` and
`/recovery` expose the workflows. Real approved host operations remain unverified.

See the [current project status](../PROJECT_STATUS.md) for the
implemented scope, migration checkpoint, verification evidence and remaining work.
The specification below also includes target design; it is not evidence that
every described capability is implemented or live-verified.


## 1. Daemon Architecture & Principles

The **Internal Connector** (`ryvix-agent`) is a purpose-built system daemon engineered for:
1. **Minimal Footprint**: Low memory footprint (<50MB RAM) and CPU usage (<1% core utilization).
2. **Zero Inbound Attack Surface**: Operates exclusively over outbound TLS connections.
3. **Resilience**: Operates gracefully during network partitions with local ring-buffering.

---

## 2. Telemetry Extractors

The daemon includes dedicated extraction workers:

| Extractor | Source | Sampling Frequency | Metrics / Information Collected |
| :--- | :--- | :--- | :--- |
| **OS Metrics** | `/proc/stat`, `/proc/meminfo`, `/proc/diskstats` | Every 5 seconds | CPU utilization, memory distribution, disk IOPS, disk space. |
| **Network** | `/proc/net/dev`, `/proc/net/tcp` | Every 10 seconds | Throughput, packet drops, active socket counts. |
| **Process Tree**| `/proc/[pid]/stat` | Every 15 seconds | Top 20 processes by CPU and RSS memory. |
| **Systemd Units**| D-Bus `/org/freedesktop/systemd1` | Event-driven + 30s | State changes of active services (active, failed, reloading). |
| **Container Engine**| Docker / Containerd UNIX socket | Event-driven + 15s | Container health status, restart counters, container CPU/RAM. |
| **Security Logs**| `/var/log/auth.log` / `journald` | Streaming | Failed SSH logins, sudo executions, user account changes. |

---

## 3. Local Ring Buffer & Partition Tolerance

During transient network disconnects between the customer host and the Ryvix gateway:
- Telemetry events are stored in a fixed-size in-memory ring buffer (default: 1,000 events / ~2MB).
- If the disconnect exceeds 5 minutes, lowest-priority metrics are overwritten; critical security events and error logs are retained.
- Upon reconnection, buffered events are transmitted in compressed batches with original timestamps.
