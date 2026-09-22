# Ryvix Autonomous Self-Healing Architecture

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
