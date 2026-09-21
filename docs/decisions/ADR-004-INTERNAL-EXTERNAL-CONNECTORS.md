# ADR-004: Strict Separation of Internal and External Out-of-Band Connectors

## Context
When a customer server fails completely (e.g. kernel panic, out-of-memory lockup, or ungraceful shutdown), an agent daemon running solely inside that server also crashes. If the platform relies solely on in-host agents, all observability and control are lost simultaneously.

## Decision
Enforce a strict architectural separation between two independent paths:
1. **Internal Connector (In-Host Agent)**: Runs as an unprivileged daemon inside the customer server, collecting high-fidelity internal metrics, systemd states, container metrics, and logs.
2. **External Connector (Out-of-Band Control Path)**: Runs externally within Ryvix infrastructure. It conducts multi-region synthetic reachability checks and connects to cloud provider APIs (AWS, DigitalOcean, Hetzner, GCP) to initiate authorized hardware reboots when the internal connector stops responding.

## Consequences
- **Positive**: Complete survivability of incident detection and recovery during catastrophic server crashes.
- **Negative**: Requires customer to provide scoped cloud provider API credentials to enable out-of-band recovery.

## Alternatives Considered
- **Internal Agent Only**: Rejected because total server crashes leave the platform completely blind and unable to recover.
- **External Probes Only (Black-box)**: Rejected because external ping/HTTP checks cannot inspect OS memory, CPU processes, or container logs.
