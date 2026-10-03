# Ryvix Server Operations & Incident Management Runbook

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


## 1. Product Capabilities for Server Operations

Ryvix provides comprehensive operational capabilities for managing Linux virtual machines, bare metal servers, and container workloads without requiring direct terminal SSH access.

---

## 2. Common Operational Scenarios

### 2.1 High CPU & Resource Saturation
- **User Prompt**: *"Why is the web server running so hot?"*
- **Ryvix Investigation**:
  1. Internal connector queries real-time process list sorted by `%CPU`.
  2. Identifies runaway process: `python app/worker.py` consuming 198% CPU.
  3. Tails stdout/stderr for `app/worker.py` to identify infinite loop in processing batch job `#482`.
  4. Presents findings to customer with recommended action: *"Kill process and restart worker service with timeout flag?"*
  5. Upon approval, dispatches whitelisted capability `service.restart('ryvix-worker')`.

### 2.2 Disk Capacity Exhaustion
- **Trigger**: Automated alert when `/var/log` partition reaches 92% capacity.
- **Ryvix Investigation**:
  1. Identifies huge unrotated log files: `nginx/access.log` (18GB).
  2. Confirms logrotate service was halted due to broken syntax in custom config.
  3. Recommends safe truncation and logrotate repair.
  4. Awaits customer confirmation, safely truncates old log chunks, and verifies disk capacity returns to 28%.

### 2.3 Unreachable Server Recovery (Out-of-Band)
- **Trigger**: Internal connector stops heartbeating; multi-region TCP ping fails.
- **Ryvix Investigation**:
  1. External connector queries AWS EC2 API: Instance status checks report `1/2 checks passed (System reachability failed)`.
  2. AI synthesizes emergency card: *"Host web-prod-01 is kernel frozen. In-host agent unresponsive. Hypervisor check failed."*
  3. User follows the WhatsApp link, signs into the recovery page and independently approves the exact cloud target.
  4. External connector sends `ec2:RebootInstances` request.
  5. Machine boots; internal agent restores; HTTP 200 health verified.
