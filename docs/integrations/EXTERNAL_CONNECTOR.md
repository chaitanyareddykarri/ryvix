# External Out-of-Band Connector Specification

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


## 1. System Mission & Independence

The **External Connector** is Ryvix's out-of-band resilience system. Operating entirely outside the customer host, it maintains reachability visibility and cloud-level control regardless of whether the internal host OS is functional, hung, or completely crashed.

---

## 2. Multi-Region Synthetic Health Probing

- **Probe Workers**: Distributed across multiple cloud availability zones (US East, US West, Europe, Asia-Pacific).
- **Protocols**:
  - `HTTP/HTTPS`: Validates status codes (2xx/3xx), response latency, and SSL certificate validity days.
  - `TCP SYN`: Probes critical application ports (80, 443, 22, 5432).
  - `ICMP Ping`: Probes network layer reachability and packet loss.
- **Quorum Consensus**: A server is only declared unreachable when at least **2 distinct probe regions** confirm failure simultaneously, eliminating false positives from regional internet routing hiccups.

---

## 3. Cloud Provider Integration & Emergency Recovery

When authorized by the customer, the External Connector securely connects to hypervisor-level cloud APIs:

| Cloud Provider | Scoped API Actions Authorized | Recovery Mechanism |
| :--- | :--- | :--- |
| **Amazon Web Services (AWS)** | `ec2:DescribeInstanceStatus`, `ec2:RebootInstances` | ACPI graceful reboot or hypervisor power-reset. |
| **DigitalOcean** | `GET /v2/droplets/{id}`, `POST /v2/droplets/{id}/actions (power_cycle)` | Droplet power cycle via REST API. |
| **Hetzner Cloud** | `GET /v1/servers/{id}`, `POST /v1/servers/{id}/actions/reset` | Hardware reset signal via Hetzner API. |
| **Google Cloud (GCP)** | `compute.instances.get`, `compute.instances.reset` | Compute Engine instance reset. |

### Recovery Safety Guardrails:
1. **Never Automatic Without Explicit Policy**: Emergency reboots require manual confirmation via WhatsApp or Web Chat unless the customer explicitly enables an automated "Emergency Self-Healing Policy" with rate-limiting (e.g. max 1 reboot per 6 hours).
2. **KMS Encrypted API Keys**: Provider credentials are stored in encrypted vaults and decrypted only in ephemeral recovery workers.
