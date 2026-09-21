# Ryvix Containerization & Docker Architecture

## 1. Executive Summary

Docker plays a critical, targeted role in Ryvix. Rather than containerizing every subsystem unnecessarily, Ryvix uses Docker where container isolation provides essential security and reproducibility guarantees.

---

## 2. Definitive Subsystem Containerization Matrix

| Subsystem | Containerized? | Rationale & Architecture |
| :--- | :--- | :--- |
| **Isolated Coding Sandboxes** | **YES (Mandatory)** | Ephemeral containers provisioned per coding task to build, test, and preview customer code safely. |
| **Worker Task Consumers** | **YES (Production)** | BullMQ / Redis worker services packaged in containers for horizontal scaling. |
| **Backend API Gateway** | **YES (Production)** | Express / Node.js API packaged in lightweight multi-stage Alpine images for cloud orchestration. |
| **Web UI (Next.js)** | **YES (Production)** | Standalone Next.js production build packaged in minimal Node.js container. |
| **Supabase PostgreSQL** | **NO (Prohibited)** | Supabase is already cloud-hosted (`https://tsoyrpgifovzwqtgpkkb.supabase.co`). Running a local Postgres container would cause duplicate databases and split-brain data states. |
| **AI LLM Inference** | **NO (Prohibited)** | Foundation models (DeepSeek, Llama) are hosted on external serverless inference endpoints (Hugging Face). Multi-gigabyte tensor weights do not run in local containers. |
| **In-Host Customer Agent** | **NO (Native Service)** | Customer server monitoring runs as a lightweight native systemd daemon (or minimal sidecar), not a heavyweight virtualization container. |

---

## 3. Container Security Hardening

1. **Non-Root By Default**: Every Ryvix container drops root privileges and executes as an unprivileged user (`UID 1000`).
2. **Read-Only Root Filesystems**: Production containers run with `--read-only` root filesystems; temporary state is confined to ephemeral in-memory `tmpfs` mounts.
3. **No Socket Sharing**: `/var/run/docker.sock` is accessible **only** to the internal worker manager for provisioning coding sandboxes. It is **never** mounted inside customer workspace containers.
4. **Hermetic Base Images**: Multi-stage Docker builds discard build-time compilers and devDependencies, minimizing container image attack surfaces.

---

## 4. Local Development vs. Production Topology

- **Local Development**: Developers run `npm run dev` directly via npm workspaces (`@ryvix/web`, `@ryvix/backend`) for sub-second hot reloading.
- **Production Deployment**: Services are packaged into versioned OCI containers (`ryvix-web:tag`, `ryvix-backend:tag`, `ryvix-worker:tag`) deployable to Kubernetes, AWS ECS, or Fly.io.
