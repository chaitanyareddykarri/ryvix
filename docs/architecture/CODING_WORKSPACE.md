# Ryvix Coding Workspace Architecture

## 1. Overview & Operational Need

When a user requests a code change that requires dependency installation, compilation, automated test verification, or live frontend preview rendering, Ryvix provisions an **isolated, stack-aware Coding Workspace**.

Simple file modifications (such as updating documentation or static configuration files) can be handled directly via GitHub API operations without provisioning a workspace. However, any change that requires build verification or runtime validation must run in an isolated sandbox.

---

## 2. Workspace Provisioning Lifecycle

```
[ User Coding Request ]
           │
           ▼
[ Project Analyzer ] ──> Detects: Node.js 20, Next.js 14, pnpm
           │
           ▼
[ Workspace Engine ] ──> Selects Base Image: `ryvix-runner-node:20`
           │
           ├── 1. Provision Ephemeral Container (CPU: 2 cores, RAM: 4GB, Disk: 10GB)
           ├── 2. Shallow Clone / Checkout Target Branch from GitHub
           ├── 3. Restore Cached Dependencies (if warm cache available)
           ├── 4. Apply Code Modification (Unified Diff / AST Replacement)
           ├── 5. Execute Build Command (`pnpm build`)
           ├── 6. Execute Test Suite (`pnpm test`)
           ├── 7. Spin up Preview Server (if frontend change requested)
           └── 8. Teardown Sandbox & Evict Ephemeral Storage
```

---

## 3. Stack-Aware Runtime Templates

Workspaces are not monolithic images bloated with every runtime. Instead, Ryvix uses lightweight, purpose-built runner templates managed by the Workspace Engine:

| Stack Detected | Base Runner Template | Typical Package Managers & Tools |
| :--- | :--- | :--- |
| **JavaScript / TypeScript** | `ryvix-runner-node` (20/22) | npm, pnpm, yarn, bun, vitest, jest |
| **Python** | `ryvix-runner-python` (3.10/3.12)| pip, poetry, uv, pytest, black |
| **Go** | `ryvix-runner-golang` (1.22) | go modules, golangci-lint |
| **Rust** | `ryvix-runner-rust` (1.78) | cargo, rustfmt, clippy |
| **PHP** | `ryvix-runner-php` (8.3) | composer, phpunit |
| **Docker / Multi-stack** | `ryvix-runner-polyglot` | Isolated rootless Docker-in-Docker |

---

## 4. Resource & Security Isolation

- **Non-Root Execution**: Workspace runners execute strictly as unprivileged users (UID 1000).
- **Network Sandboxing**:
  - Egress during dependency installation is restricted to package registries (`npmjs.org`, `pypi.org`, `crates.io`).
  - Access to internal Ryvix infrastructure, metadata endpoints, and customer production servers is blocked at the network level.
- **Resource Hard-Caps**: Enforced via cgroups (Max CPU: 2 vCPU, Max RAM: 4GB, Max Execution Time: 15 minutes).
- **Ephemeral Storage**: All container layers and scratch files are written to tmpfs or ephemeral volumes that are destroyed upon task completion.

---

## 5. Decision Matrix: Direct Workflow vs. Isolated Workspace

| Attribute | Direct Repository Workflow | Isolated Coding Workspace |
| :--- | :--- | :--- |
| **Use Cases** | Doc edits, typos, markdown, static configs, simple regex replacements | UI changes, logic updates, dependency upgrades, refactoring |
| **Execution Sandbox** | None (GitHub API only) | Ephemeral container sandbox |
| **Build & Test Run** | Deferred to Customer CI/CD | Executed and verified locally before commit |
| **Frontend Preview** | Not available | Ephemeral URL generated |
| **Resource Cost** | Minimal / Instant | Requires container spin-up (10-30s) |

## 10. Implemented Components & Verification Status (Path 1)
- **Repository Analyzer**: `RepositoryAnalyzer` in `backend/src/connectors/github.connector.ts` detecting Next.js, Node.js, Python/FastAPI, Go, Rust, Docker.
- **Docker Sandbox Manager**: `DockerWorkspaceManager` in `services/src/workspace/docker-workspace.manager.ts` managing containers (`ryvix_sbx_*`), port mapping (`3100+`), diff application, command execution, and 15m expiry.
- **Pull Request Service**: `PullRequestService` in `backend/src/services/pr.service.ts` opening GitHub PRs with branch names and additions/deletions summaries.
- **Interactive Web Console**: `web/app/tasks/page.tsx` and `web/app/api/tasks/route.ts`.
- **Test Suite**: `tests/coding-workspace.test.ts` (100% PASSED).
