# Ryvix Omnichannel User Flows Specification

## 1. Interaction Channels Overview

Ryvix provides three primary interaction channels designed for distinct operational contexts:
- **Web Console & Web Chat**: Primary high-fidelity workspace for code diff inspections, interactive terminal logs, frontend previews, and metric dashboards.
- **WhatsApp**: Mobile-first, on-the-go channel for receiving critical alerts, querying server health, and approving emergency recovery actions.
- **Gmail**: Asynchronous channel for receiving daily operational summaries, deployment digests, and submitting non-urgent coding requests.

---

## 2. Omnichannel Flow Diagrams

### Flow A: Mobile Emergency Incident via WhatsApp
```
[ Customer Server Crashes ]
         │
         ▼
[ Ryvix External Connector detects unreachability ]
         │
         ▼
[ WhatsApp Bot sends alert message to on-call engineer ]
  "🚨 ALERT: Production host web-01 is unreachable!
   External probe timed out after 3 retries.
   Internal connector stopped streaming.
   Action Recommended: Out-of-Band Cloud Reboot.
   [ Reply 1 or tap Button: 'Approve Cloud Reboot' ]"
         │
         ▼
[ Engineer taps 'Approve Cloud Reboot' ]
         │
         ▼
[ Ryvix Backend verifies cryptographic signature & permissions ]
         │
         ▼
[ External Connector executes reboot via DigitalOcean API ]
         │
         ▼
[ WhatsApp Bot updates thread ]
  "✅ Reboot signal acknowledged. Host web-01 rebooted.
   Internal connector resumed. Health: OK (HTTP 200)."
```

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
