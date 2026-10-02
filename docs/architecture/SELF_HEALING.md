# Ryvix Autonomous Self-Healing Architecture

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


## 1. Overview
The Self-Healing Engine provides automated incident remediation across customer infrastructure with strict blast-radius controls, circuit-breaker safety limits, and human approval gates.

See authoritative reference: [SELF_HEALING_ARCHITECTURE.md](./SELF_HEALING_ARCHITECTURE.md)

## 2. Remediation Flow
```
Telemetry / Logs / Health Probe
        ↓
Detection & Anomaly Triage
        ↓
Local Intelligence / AI Diagnosis (Fact vs Inference)
        ↓
Remediation Plan Formulation
        ↓
Authorization & Blast-Radius Assessment
        ↓
Execution via Authorized Backend Tool (Internal Connector / Cloud Bridge)
        ↓
Post-Action Equilibrium Verification
        ↓
Success / Circuit Breaker (3 Attempts Max) / Escalation
```
