# Ryvix Connector Architecture: Dual-Path Isolation & Recovery

## 1. Dual-Path Architecture Overview

A core architectural principle of Ryvix is the strict separation between the **Internal Connector** and the **External Out-of-Band Connector**. 

Traditional server management agents fail completely when the host operating system crashes, freezes, or experiences kernel panics. In such cases, the in-host agent dies alongside the OS, leaving the platform entirely blind. Ryvix overcomes this vulnerability by maintaining two independent communication and control paths.

```
                           +------------------------+
                           |     RYVIX BACKEND      |
                           +------------------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
         +-------------------+                   +-------------------+
         | Internal Gateway  |                   | External Monitor  |
         | Telemetry Engine  |                   | Cloud Recoverer   |
         +-------------------+                   +-------------------+
                   |                                       |
                   | (Outbound TLS Stream)                 | (Out-of-Band Cloud API)
                   v                                       v
      +-------------------------+             +-------------------------+
      |     CUSTOMER HOST       |             |   CLOUD PROVIDER API    |
      | +---------------------+ |             | AWS, DO, Hetzner, GCP   |
      | | Internal Connector  | |             +-------------------------+
      | | - OS metrics        | |                          |
      | | - Systemd logs      | |                          | (Hypervisor Control)
      | | - Process tree      | |                          v
      | | - Container runtime | |             +-------------------------+
      | +---------------------+ |<------------| VM Power / Hard Reboot  |
      +-------------------------+             +-------------------------+
```

---

## 2. Path 1: The Internal Connector

### 2.1 Purpose & Execution Model
The **Internal Connector** is a lightweight, high-efficiency daemon (written in Go or Rust) that runs inside the customer's virtual machine, bare-metal server, or container environment.
- **Connection Model**: Outbound-only TLS WebSocket or gRPC connection to the Ryvix Telemetry Gateway. The customer does **NOT** need to open any inbound firewall ports or expose SSH.
- **Resource Envelope**: Strictly bounded to `<1% CPU` and `<50MB RAM`.

### 2.2 Telemetry Collection Capabilities
- **System Metrics**: High-frequency CPU, memory utilization, swap usage, disk partition capacity, I/O wait, and network interface throughput.
- **Process & Service Tracking**: Active process trees, top resource consumers, systemd service states (active/failed/restarting).
- **Log Streaming**: Tailing systemd journal logs, syslog, Docker container stdout/stderr, and specified application log files.
- **Container Observability**: Real-time stats from Docker or containerd runtimes (container health, restart counts, exit codes).
- **Security Signals**: Failed authentication attempts (`/var/log/auth.log`), privilege escalation events (`sudo` logs), and new listening sockets.

### 2.3 Controlled In-Host Execution
The internal connector does **NOT** allow arbitrary root shell commands. All operations must match a typed **Capability Manifest**:
- `service.restart(name: string)`: Restarts a whitelisted systemd unit.
- `container.restart(id: string)`: Restarts a specific Docker container.
- `logs.fetch(filter: LogQuery)`: Retrieves targeted log slices.
- `disk.cleanup_temp()`: Truncates ephemeral files in `/tmp` according to customer policies.

---

## 3. Path 2: The External Out-of-Band Connector

### 3.1 Purpose & Independence
The **External Connector** operates completely outside the customer's server and host operating system. It executes from Ryvix-managed monitoring nodes and cloud worker pools.

If the customer's server crashes, experiences network partition, or runs out of memory (OOM kernel freeze):
1. The Internal Connector stops sending heartbeats and telemetry.
2. The External Path remains 100% operational, immediately detecting the failure.

### 3.2 External Capabilities
- **Synthetic Reachability Probing**: Periodic multi-region ping, TCP port probes, and HTTPS health checks against customer domain endpoints.
- **Cloud Infrastructure Control**: Securely interfaces with customer-authorized cloud provider APIs (AWS EC2, DigitalOcean, Hetzner Cloud, Google Cloud Compute):
  - Check instance state (running, stopped, provisioning).
  - Inspect hypervisor-level CPU and status metrics.
  - Trigger authorized power operations: graceful ACPI shutdown, hard power cycle, or instance reset.

---

## 4. Failure & Recovery Lifecycle

The dual-path design enables automated, safe recovery during severe infrastructure outages:

```
[ Normal Operation ]
  - Internal Connector: Streaming 5s metrics, logs, and process states
  - External Connector: Performing 30s HTTP/TCP synthetic reachability probes
  - System Status: HEALTHY
       │
       ▼
[ Catastrophic Event: Kernel Freeze / OOM Lockup ]
  - Internal Connector: Heartbeat halts abruptly. Disconnected from Gateway.
  - Target Server: Unresponsive to network traffic.
       │
       ▼
[ Failure Detection ]
  - Ryvix Backend marks Internal Connector status: UNREACHABLE (grace period: 45s).
  - External Connector triggers multi-region probe: Confirms connection timeout.
  - System Status: DOWN / UNREACHABLE
       │
       ▼
[ Incident Triage & Emergency Verification ]
  - Backend checks customer recovery policy:
    * Is Out-of-Band recovery authorized?
    * Does this project have cloud provider credentials configured?
  - Ryvix alerts on-call engineer via WhatsApp / Web Chat with one-click recovery card.
       │
       ▼
[ Authorized Recovery Execution ]
  - Customer approves recovery via WhatsApp or Web console (or pre-authorized auto-policy).
  - External Connector invokes Cloud Provider API: `POST /instances/{id}/actions/reboot`
  - Hypervisor hard-resets the virtual machine.
       │
       ▼
[ System Resumption & Verification ]
  - Customer OS boots back up; networking restores.
  - Internal Connector auto-starts via systemd; reconnects to Ryvix Ingestion Gateway.
  - Ryvix verifies:
    1. External probe returns HTTP 200 OK.
    2. Internal telemetry confirms normal CPU/RAM and healthy process tree.
  - System Status: RECOVERED. Incident report generated and audit logged.
```

---

## 5. Security & Isolation Matrix

| Dimension | Internal Connector | External Out-of-Band Connector |
| :--- | :--- | :--- |
| **Location** | Inside customer server / container | Inside Ryvix cloud worker pool |
| **Inbound Ports Required** | **Zero** (outbound WebSocket/gRPC only) | **Zero** on customer host (API-based) |
| **Credentials Used** | Ephemeral ed25519 token / JWT | Scoped Cloud Provider API Token (KMS-backed) |
| **Execution Boundary** | Strictly whitelisted systemd / Docker commands | Strictly scoped instance reboot / power APIs |
| **Failure Survivability**| Dies if server OS crashes | **Unaffected by server OS crashes** |
