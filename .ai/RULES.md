# Ryvix Engineering Rules & Invariants

All developers and AI coding agents working on the Ryvix repository must strictly adhere to these non-negotiable rules.

---

## 1. Secrets & Credentials
- **NEVER** commit secrets, API keys, service account credentials, private keys, or passwords to git.
- Never print credentials, tokens, or raw authorization headers to logs, console output, or telemetry streams.
- All customer credentials (GitHub tokens, provider API keys, server SSH keys) must be encrypted at rest in Supabase/backend vaults.
- Keep `.env.local` ignored and reference variables in `.env.example`.

---

## 2. AI Execution & Model Independence
- The AI model must **NEVER** receive direct, unrestricted shell or SSH access to any customer environment.
- The AI model must **NEVER** receive raw GitHub private keys, Gmail OAuth tokens, or database connection strings.
- **AI Database Isolation**: AI components must never receive unrestricted Supabase service-role/database credentials. Database operations initiated by AI must pass through controlled Ryvix tools/services and authorization.
- The AI system must remain **provider-agnostic** via `ModelProviderRegistry` (supporting Hugging Face, OpenAI, Anthropic, and local vLLM). Do NOT hardcode vendor-specific response formats into core business logic.
- All AI actions must be mediated via discrete, strongly typed tool calls dispatched by the Ryvix Backend.

---

## 3. Self-Healing Safety & Action Authorization
Self-healing must never become uncontrolled autonomous intervention. Adhere to the **4-Tier Action Hierarchy**:
- **Level 0 (Read-Only Observation)**: Autonomous (metrics, logs, process lists).
- **Level 1 (Safe Diagnostics)**: Autonomous (`systemctl status`, `ss -tulpn`, `curl /health`).
- **Level 2 (Low-Risk Remediation)**: Automated with rate limits (log truncation, UFW IP block, worker restart).
- **Level 3 (High-Impact Actions)**: **MANDATORY HUMAN APPROVAL** (stopping services, killing processes `kill -9`, production rollback, hypervisor reboots `ec2:RebootInstances`).
- **Anti-Looping Circuit Breakers**:
  - Maximum 3 restart attempts per unit within a 15-minute rolling window.
  - Exponential cooldown (immediate → 60s → 300s → Circuit Open).
  - Hard timeouts (30s in-band, 180s out-of-band cloud reboots).
  - Immediate escalation to on-call human engineers if verification fails after Attempt 3.

---

## 4. Coding Sandbox Isolation & Docker
- **Customer code, compilation scripts, and test suites must NEVER execute directly on the Ryvix host.**
- Ephemeral Docker containers must run as unprivileged users (`UID 1000`).
- Sandboxes must enforce cgroup limits: max 2 vCPUs, 4GB RAM, and a 15-minute hard execution timeout.
- `/var/run/docker.sock` is **NEVER** mounted inside customer workspace containers.
- Workspaces must be profile-driven (Node, Python, .NET, Rust, Go, Flutter), not monolithic images.
- **Supabase Cloud Rule**: Do **NOT** spin up a local PostgreSQL container in Docker. Supabase is already hosted in the cloud (`https://tsoyrpgifovzwqtgpkkb.supabase.co`).

---

## 5. Multi-Channel Connectors
- Maintain strict architectural separation between:
  - **Internal In-Band Connector**: Runs on customer host; collects metrics, logs, unit states.
  - **External Out-of-Band Connector**: Cloud provider API probe (AWS EC2 / GCP Compute) for recovering kernel-frozen or unreachable servers.
- **Communication Channel Invariant**:
  - Personal or Workspace Gmail accounts are for customer notifications and task replies only.
  - User authentication OTPs are strictly routed through dedicated transactional SMTP (Supabase Auth).

---

## 6. Permission & Database Tenancy
- Every incoming request and tool invocation must be verified against project permissions and user roles (`owner`, `admin`, `developer`, `viewer`).
- Supabase Row Level Security (RLS) must be enabled on 100% of tables in PostgreSQL.
- Multi-tenancy must be strictly enforced via `organization_id` and `project_id` scoping on all queries.
- Every operational action, tool execution, and user approval must be immutably recorded in `public.audit_events` (`REVOKE UPDATE, DELETE`).
