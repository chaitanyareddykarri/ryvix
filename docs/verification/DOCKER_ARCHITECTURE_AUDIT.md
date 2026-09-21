# Gate 1: Docker Architecture Audit & Container Strategy

## 1. What Docker Is Needed For in Ryvix

In the Ryvix architecture, Docker serves specific, targeted purposes:
1. **Isolated Customer Coding Workspaces**: The primary and most critical use of containerization. When executing user code, compiling customer projects, and generating frontend previews, execution **must** run inside ephemeral container sandboxes with strict resource and network constraints. Customer code must never run directly on the host OS.
2. **Reproducible Local Development**: Optional local composition for backing services (e.g. local Redis queue for BullMQ background workers).
3. **Packaging for Deployment**: Containerizing the Node.js/Next.js Web frontend, Backend API orchestrator, and background worker services for production orchestration (e.g., Kubernetes, ECS, or Fly.io).
4. **CI/CD Build & Testing**: Hermetic runner environments for executing automated test suites across the monorepo.

---

## 2. What Should NOT Run in Docker

* **Supabase / PostgreSQL**: Supabase is already hosted in the cloud (`https://tsoyrpgifovzwqtgpkkb.supabase.co`). Do **NOT** spin up a local duplicate PostgreSQL container in Docker for core application data. Unnecessarily containerizing a second PostgreSQL instance causes split-brain data states.
* **AI Model Engine**: The AI model is deployed independently on Hugging Face (or serverless LLM endpoints). Do **NOT** run multi-gigabyte foundation model weights inside local Docker containers on developer machines.
* **In-Host Customer Server Agent**: While the internal connector can monitor container runtimes, the internal connector daemon itself is engineered to run as a native systemd daemon (or minimal sidecar) inside the customer host, not an all-encompassing virtualization container.

---

## 3. Subsystem Container Architectures

### 3.1 Local Development Architecture
* **Web & Backend**: Run natively on Node.js using npm workspaces (`npm run dev`) with hot-module reloading.
* **Redis**: Can optionally run via a lightweight local Docker container for queue dispatching if local workers are tested.

### 3.2 Backend Container Architecture (`backend/Dockerfile`)
* Multi-stage Node.js Alpine/Debian-slim image.
* Builds `@ryvix/database` and `@ryvix/backend`.
* Runs as unprivileged user (`USER node` / UID 1000).

### 3.3 AI Container Architecture (`ai/`)
* Stateless gateway container wrapping the Hugging Face API client, prompt assembler, and response validator.
* Zero GPU hardware dependencies in this container; all heavy tensor compute resides on remote Hugging Face endpoints.

### 3.4 Worker / Service Architecture (`services/Dockerfile`)
* Background task consumer executing BullMQ jobs.
* Requires access to the Docker daemon (or rootless Docker socket) exclusively for spawning isolated workspace sandboxes.

### 3.5 Coding-Workspace Container Architecture
* Ephemeral, stack-aware sandbox containers provisioned per coding task.
* Enforced via cgroups: max 2 vCPUs, 4GB RAM, 15-minute execution timeout.
* Network namespace blocked from accessing Ryvix internal VPC or customer production networks.
* Sandboxes destroyed immediately upon build/test completion.

---

## 4. Audit of Current Docker Assets

| Asset Candidate | Current State | Requirement in Phase 0/1 | Action Recommended |
| :--- | :--- | :--- | :--- |
| `infrastructure/.dockerignore` | Missing | Recommended | Create root `.dockerignore` to protect secrets and `.git`. |
| `docker-compose.yml` | Missing | Not required in Phase 1 | Defer to Phase 2 when local Redis/workers are introduced. |
| `Dockerfile` (Backend/Web) | Missing | Not required in Phase 1 | Defer to Phase 10 (Deployment packaging). |
| `workspace/Dockerfile.*` | Missing | Not required in Phase 1 | Implement in Phase 5 (Coding Workspaces). |

---

## 5. Security Invariants & Container Sandboxing
1. **Never Mount Host Docker Socket into Untrusted Workspaces**: Customer code executed in sandboxes must never have access to `/var/run/docker.sock`.
2. **Read-Only Root Filesystems**: Workspace containers should mount root filesystems as read-only, using an isolated `tmpfs` volume for `/tmp` and workspace scratch spaces.
3. **No Root Execution**: All processes must execute under non-zero UIDs.

---

## 6. Recommended Implementation Schedule
* **Phase 0/1 (Now)**: Establish root `.dockerignore` to safeguard build contexts.
* **Phase 2 (Backend)**: Add optional developer `docker-compose.dev.yml` for Redis backing services.
* **Phase 5 (Workspaces)**: Implement stack-aware runner Dockerfiles (`ryvix-runner-node`, `ryvix-runner-python`).
* **Phase 10 (Packaging)**: Production multi-stage Dockerfiles for Web and Backend services.
