# Ryvix Backend & Orchestrator Architecture Specification

## 1. Role and Core Responsibilities

The **Ryvix Backend** is the authoritative control and orchestration layer of the platform. It serves as the single source of truth for all business logic, permission verification, workflow orchestration, tool execution, and audit logging.

```
                              +--------------------+
                              |  Client Channels   |
                              | Web, WhatsApp, Mail|
                              +--------------------+
                                        |
                                        v
+---------------------------------------------------------------------------------+
|                               RYVIX BACKEND CORE                                |
|                                                                                 |
|   +-------------------+   +--------------------+   +------------------------+   |
|   |  API Gateway &    |   |  Permission Engine |   |  Task Orchestrator &   |   |
|   |  Auth Middleware  |-->|  - Project RBAC    |-->|  State Machine         |   |
|   |  - Supabase JWT   |   |  - Resource Scopes |   |  - Task Lifecycle      |   |
|   +-------------------+   +--------------------+   +------------------------+   |
|                                                                |                |
|                                                                v                |
|   +-------------------+   +--------------------+   +------------------------+   |
|   |  Audit Logger     |   |  Policy Gate &     |   |  Tool Dispatcher &     |   |
|   |  - Immutable log  |<--|  Approval Manager  |<--|  Execution Broker      |   |
|   |  - Hashes & diffs |   |  - Tier evaluation |   |  - Schemas & Validation|   |
|   +-------------------+   +--------------------+   +------------------------+   |
+---------------------------------------------------------------------------------+
          |                                               |
          v                                               v
+-------------------+                           +--------------------+
|  Supabase Postgres|                           | Ryvix Worker Pool  |
+-------------------+                           +--------------------+
```

---

## 2. Task Orchestrator & State Machine

Every asynchronous operation in Ryvix (code changes, server investigations, builds, deployments, and recoveries) is tracked as a first-class **Task** entity.

### Task State Lifecycle:
1. `QUEUED`: Request ingested from Web Chat, WhatsApp, or Gmail. Initial validation passed.
2. `PLANNING`: Worker compiles project context and requests an execution plan from the AI Model Gateway.
3. `AWAITING_APPROVAL`: If the plan involves Tier 3, 4, or 5 operations, the state halts until the user approves via Web or WhatsApp.
4. `EXECUTING`: Worker executes the approved plan steps via isolated sandboxes or connector tools.
5. `VERIFYING`: Automated build, test, preview generation, or post-deployment telemetry verification.
6. `COMPLETED`: Verification successful; summary dispatched to client channel; audit log finalized.
7. `FAILED`: Unrecoverable execution or verification failure; detailed error and diagnostic trace saved.
8. `CANCELLED`: User manually aborted the task before or during execution.

---

## 3. Tool Dispatcher & Policy Gate

The AI Model never invokes external APIs directly. When the model requests a tool call:
1. **Schema Validation**: The Tool Dispatcher verifies input parameters against registered Zod/Pydantic schemas.
2. **Permission Evaluation**: The Permission Engine confirms the requesting user has appropriate scopes for the target project and resource.
3. **Policy Gate Check**:
   - **Non-destructive tools** (`read_file`, `list_processes`, `get_metrics`) execute immediately.
   - **Destructive or production tools** (`commit_changes`, `restart_service`, `reboot_server`) transition the task into `AWAITING_APPROVAL`.
4. **Execution Broker**: Dispatches work to the appropriate execution provider (Git manager, ephemeral coding workspace, or server connector).
5. **Result Capture**: Standard output, standard error, and exit codes are recorded, hashed, and returned to the AI reasoning loop.

---

## 4. Permission Engine & Multi-Tenancy

Ryvix implements strict multi-tenancy enforced at both the application API layer and database layer:
- **Organization & Project Hierarchy**: Users belong to Organizations. Repositories, servers, and connectors belong to Projects.
- **Role-Based Access Control (RBAC)**:
  - `Owner`: Full control, billing, cloud provider credential management.
  - `Admin`: Approve production deployments, manage server connectors, configure integrations.
  - `Developer`: Create tasks, request code changes, view logs, test previews.
  - `Viewer`: Read-only access to dashboards, logs, and audit trails.
- **Supabase Integration**: The backend converts Supabase Auth JWT claims into verified internal session contexts and enforces PostgreSQL Row-Level Security (RLS) policies.

---

## 5. Audit & Compliance Ledger

The Backend guarantees that every action is fully traceable:
- **Pre-execution Snapshot**: Records the state of resources before an action is applied.
- **Unified Diff Storage**: All code modifications are stored as standard unified diffs.
- **Non-Repudiation**: Records user identifier, channel used (Web/WhatsApp/Gmail), IP address, AI model version, tool parameters, and output hashes.
- **Immutability**: Audit entries are written to PostgreSQL tables where `UPDATE` and `DELETE` privileges are permanently revoked.
