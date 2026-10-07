# Ryvix Autonomous Self-Healing Architecture

## Implementation status - October 7, 2026

Hosted migrations are applied through `20261007000001`; no numbered migrations
remain pending at the latest rollout. See [project status](../PROJECT_STATUS.md)
for completed UI, authentication, team, repository and fleet work and recorded
verification. The [pending queue](../PENDING_WORK.md) separates unfinished code,
deployment configuration and live acceptance. Design details below describe
scope, not production certification.

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
