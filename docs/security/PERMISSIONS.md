# Ryvix Permission Engine & Access Control Matrix

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


## 1. Role-Based Access Control (RBAC) Hierarchy

Permissions in Ryvix are scoped strictly to **Organizations** and **Projects**.

| Role | Scope | Description & Rights |
| :--- | :--- | :--- |
| **Owner** | Organization | Full administrative rights: Billing, user management, project deletion, KMS credential management. |
| **Admin** | Project | Project-level administrative rights: Connector enrollment, cloud recovery configuration, emergency approvals. |
| **Developer** | Project | Operational & development rights: Trigger coding tasks, request builds/previews, view logs/metrics, approve PRs. |
| **Viewer** | Project | Read-only rights: View dashboards, review active tasks, read telemetry streams. Cannot trigger actions or approvals. |

---

## 2. Tool Permission & Approval Matrix

Every tool invocation is evaluated against the user's role and the required action tier:

| Tool Name | Action Description | Minimum Role | Required Tier | Approval Needed? |
| :--- | :--- | :--- | :--- | :--- |
| `repo.read_tree` | Read repository directory structure | Viewer | Tier 1 | No |
| `repo.read_file` | Read source code file | Viewer | Tier 1 | No |
| `telemetry.query` | Query historical logs & metrics | Viewer | Tier 1 | No |
| `workspace.run_build` | Execute build in ephemeral sandbox | Developer | Tier 2 | No |
| `workspace.preview` | Generate temporary preview URL | Developer | Tier 2 | No |
| `repo.create_pr` | Open a Pull Request on GitHub | Developer | Tier 3 | **Yes** |
| `repo.commit_main` | Direct commit to protected branch | Admin | Tier 3 | **Yes** |
| `connector.service_restart`| Restart a systemd service | Admin | Tier 4 | **Yes** |
| `connector.cloud_reboot`| Trigger hard cloud power cycle | Owner/Admin | Tier 5 | **Yes (Emergency Approval)**|
