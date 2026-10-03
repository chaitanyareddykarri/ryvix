# Ryvix Omnichannel User Flows Specification

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


## 1. Interaction Channels Overview

Ryvix provides three primary interaction channels designed for distinct operational contexts:
- **Web Console & Web Chat**: Primary high-fidelity workspace for code diff inspections, interactive terminal logs, frontend previews, and metric dashboards.
- **WhatsApp**: Mobile-first, on-the-go channel for receiving critical alerts, querying server health, and opening authenticated recovery approval pages.
- **Gmail**: Asynchronous channel for receiving daily operational summaries, deployment digests, and submitting non-urgent coding requests.

---

## 2. Omnichannel Flow Diagrams

### Flow A: Mobile incident and authenticated recovery

1. Recorded telemetry/incident evidence establishes the observed outage.
2. An opted-in P1 recipient receives the configured WhatsApp alert template.
3. The engineer opens the authenticated recovery page for the exact request.
4. The backend requires an eligible independent approver, checks the frozen target,
   expiry, cooldown and duplicate-execution protection, then claims dispatch.
5. The configured cloud adapter records the provider response. Later observations
   record liveness; provider acceptance alone does not prove reboot or application health.

Replying YES or tapping an unimplemented approval button cannot authorize a reboot.
Real provider delivery and recovery still need deployment acceptance.

---

### Flow B: Web Chat Frontend Coding & Preview
```
[ User types in Web Chat: "Update hero banner button to violet with glow effect" ]
         │
         ▼
[ Ryvix AI analyzes repo, generates diff in ephemeral workspace ]
         │
         ▼
[ Workspace compiles bundle and launches ephemeral preview server ]
         │
         ▼
[ Web Chat renders split-view: Unified Diff + Live Interactive Preview iframe ]
         │
         ▼
[ User clicks: 'Approve & Create Pull Request' ]
         │
         ▼
[ GitHub PR opened automatically; link returned in chat ]
```

---

### Flow C: Asynchronous Digest via Gmail
```
[ Nightly 00:00 UTC Scheduled Job ]
         │
         ▼
[ Ryvix compiles daily performance, security events, and PR summaries ]
         │
         ▼
[ Email dispatched via Transactional SMTP to customer inbox ]
  "Ryvix Daily Digest: 0 security threats detected, 3 deployments verified, avg response time: 42ms."
```
