# Ryvix Permission Engine & Access Control Matrix

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
