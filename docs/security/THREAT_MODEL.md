# Ryvix STRIDE Threat Model

## 1. Threat Analysis Framework

This document outlines the formal STRIDE threat analysis conducted on the Ryvix platform.

---

## 2. STRIDE Assessment Matrix

| Threat Category | Target Vector | Potential Attack | Mitigation in Ryvix |
| :--- | :--- | :--- | :--- |
| **Spoofing** | WhatsApp Inbound Webhook | Attacker crafts fake WhatsApp messages to trigger reboots. | Webhook signatures verified via Meta HMAC-SHA256. Phone numbers strictly mapped to verified profile IDs. |
| **Tampering** | Ingested Telemetry Logs | Compromised process alters log timestamps or deletes error entries. | Telemetry signed at the daemon level; ingestion writes to append-only partitioned tables with revoked UPDATE/DELETE privileges. |
| **Repudiation** | Malicious Production Commit | Rogue user claims "The AI committed the malicious code on its own". | Mandatory cryptographic audit ledger logs: authenticated user ID, approval token, IP address, unified diff, and approval timestamp. |
| **Information Disclosure**| AI Prompt Injection | Attacker injects prompt in GitHub Issue to trick AI into revealing GitHub tokens. | AI model has **zero access** to credentials in prompt context or tools. Abstract IDs only. Secrets injected by backend directly into workers. |
| **Denial of Service** | Telemetry Stream Flooding | Host runs script generating 1M log lines/sec to exhaust Ryvix storage. | Token bucket rate limiters at Telemetry Gateway drop packets exceeding 5k lines/min. Local agent buffers and drops lowest severity first. |
| **Elevation of Privilege** | Coding Workspace Escape | Malicious repo build script attempts to escape container to host. | Workspaces run unprivileged (UID 1000) inside rootless containers with seccomp/apparmor profiles and no network access to internal VPC. |
