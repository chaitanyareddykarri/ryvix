# ADR-001: Centralized Supabase PostgreSQL Database & Strict AI Access Boundary

## 1. Context
Ryvix is an autonomous operations platform with multiple subsystems: Next.js Web Console, Core Backend Orchestrator, Ephemeral Workers, and AI Intelligence Layer. The platform requires a relational datastore for projects, tasks, model runs, tool calls, and security events. A clear architectural decision is required on:
1. Whether to maintain separate databases or a single centralized database.
2. How schema changes are version-controlled.
3. How different subsystems (Web, Backend, Workers, AI) access application data.
4. How to prevent the AI model from obtaining unrestricted database privileges.

---

## 2. Decision

### 2.1 Single Centralized Database
Adopt **ONE centralized Supabase PostgreSQL database** as the authoritative application data store. Duplicate databases for AI, backend, and web are strictly prohibited. The database is not embedded inside the web application; it is hosted in the centralized Supabase project.

### 2.2 Migrations as Source of Truth
The version-controlled source of truth for the database schema is:
```
supabase/migrations/
```
All tables, constraints, foreign keys, triggers, and Row Level Security (RLS) policies must be written as sequential, reversible SQL files. Manual table creation in the Supabase Dashboard is prohibited as a source of truth.

### 2.3 Subsystem Access Model
- **Web (`web/utils/supabase/`)**: Uses `@supabase/ssr` with publishable, client-safe keys (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Constrained strictly by PostgreSQL Row Level Security (RLS) via `auth.uid()`.
- **Backend (`backend/src/`)**: Runs server-side. Uses server-only credentials (`SUPABASE_SERVICE_ROLE_KEY`) mediated exclusively through the Repository Pattern (`TaskRepository`, `AuditRepository`, etc.).
- **Workers (`services/`)**: Background workers use scoped repository abstractions for processing telemetry streams and coding workspaces.
- **AI Model (`ai/`)**: **Zero direct database access.** The AI model never receives `SUPABASE_SERVICE_ROLE_KEY`, connection strings, or database client instances. All data queries and writes initiated by AI must flow through the **Controlled Backend Tool Execution Layer**:
  ```
  AI Model ──> Tool Request ──> Backend Permission Check ──> Repository ──> PostgreSQL
  ```

---

## 3. Security Considerations & Invariants
- **No Service-Role Key in Frontend**: `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `NEXT_PUBLIC_` and never included in client JavaScript.
- **Zero Raw Credentials to AI**: The AI model only sees abstract tool schemas; the backend enforces project-level RBAC before executing any database query.
- **Audit Immutability**: All modifications to tasks and servers are recorded in `audit_events` with revoked `UPDATE` and `DELETE` privileges.

---

## 4. Consequences
- **Positive**: Single source of truth; guaranteed tenant isolation via RLS; non-repudiation of AI actions; complete protection against AI prompt-injection leading to database exfiltration.
- **Negative**: Adds latency overhead to AI data access by requiring backend tool routing and permission evaluation.

---

## 5. Alternatives Considered
- **Direct AI Database Access (Giving AI Service-Role Key)**: Rejected as an extreme security vulnerability. Prompt injection could allow an attacker to dump all customer data or delete tables.
- **Separate Databases for Web and AI**: Rejected due to state synchronization overhead and loss of referential integrity across tasks and audit logs.
- **Embedding Database Schema Inside `web/`**: Rejected because the web application is only one consumer of the database; the database must remain a platform-level resource.
