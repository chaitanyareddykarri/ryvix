# Gate 4: Coding Workspace Architecture Audit & Sandbox Isolation

## 1. Executive Summary

A foundational invariant of Ryvix is: **Customer code must never execute directly on the Ryvix host process without isolation.**

When Ryvix modifies code, runs compilations, executes unit tests, or generates frontend previews, it does so within ephemeral, stack-aware sandboxes. The workspace system must not assume a single stack (e.g. only Node.js), but must support diverse environments through declarative **Workspace Profiles**.

```
Customer Repository (GitHub)
        │
        ▼
Repository Inspection & AST Scan
        │
        ▼
Stack Detection (Language, Framework, Package Manager, Build System)
        │
        ▼
WorkspaceProfile Selection (e.g., `ProfileNode`, `ProfilePython`, `ProfileDotNet`)
        │
        ▼
Isolated Sandbox Provisioning (Rootless Container / Ephemeral cgroup)
        │
        ├── Shallow Clone & Checkout Target Branch
        ├── Install Dependencies (`npm install`, `pip install`, `dotnet restore`)
        ├── Apply AI Code Modification (AST/Unified Diff)
        ├── Run Build (`npm run build`, `pytest`, `dotnet build`)
        ├── Execute Automated Tests
        └── Render Ephemeral Frontend Preview (if UI change)
        │
        ▼
Teardown & Ephemeral Resource Eviction
        │
        ▼
Approved Output Returned to Backend for PR / Commit
```

---

## 2. Workspace Lifecycle & Isolation Model

| Stage | Action & Security Boundary |
| :--- | :--- |
| **1. Provision** | Worker provisions a short-lived container sandbox using the detected stack runner image. |
| **2. Checkout** | Shallow clones the repository branch using a temporary, 60-minute GitHub App installation token. |
| **3. Mount** | Repository files are mounted in an isolated filesystem namespace. Host `/var/run/docker.sock` is **never** mounted. |
| **4. Dependencies** | Package installation runs as non-root (`UID 1000`). Egress is restricted to public package registries (`npmjs.org`, `pypi.org`, `nuget.org`). |
| **5. Verification** | Build and test commands execute inside the sandbox. Output stdout/stderr and exit codes are captured. |
| **6. Preview** | If frontend files were modified, an ephemeral HTTP server binds to a container port and maps to a temporary preview subdomain. |
| **7. Teardown** | Container and temporary volumes are forcefully purged. No state persists across tasks. |

---

## 3. Resource Limits & Security Hardening

To guard against malicious repositories, infinite compilation loops, and fork-bomb attacks:
* **CPU Limit**: Maximum 2 vCPUs enforced via cgroup `cpu.cfs_quota_us`.
* **Memory Limit**: Hard-cap of 4GB RAM via cgroup `memory.max`; OOM killer terminates rogue processes immediately.
* **Execution Timeout**: Hard timeout of 15 minutes per workspace session.
* **Network Sandboxing**:
  * Internal VPC endpoints, database ports, and cloud metadata services (`169.254.169.254`) are completely firewalled at the network bridge.
  * Only DNS and public HTTPS egress are allowed during dependency restoration.

---

## 4. Extensible Workspace Profile Architecture (Phase 5)

The Workspace Engine is designed around a `WorkspaceProfile` registry rather than hardcoded logic:

```typescript
interface WorkspaceProfile {
  id: string;                      // e.g. "node-20-nextjs", "python-3.12-fastapi", "dotnet-8"
  matchCriteria: (tree: FileTree) => boolean;
  baseImage: string;               // e.g. "ghcr.io/ryvix/runner-node:20"
  installCommand: string;          // e.g. "pnpm install --frozen-lockfile"
  buildCommand: string;            // e.g. "pnpm run build"
  testCommand: string;             // e.g. "pnpm run test"
  previewCommand?: string;         // e.g. "pnpm run dev -- -p 3000"
}
```

### Planned Profiles:
1. **Node / TypeScript / Next.js**: npm, pnpm, yarn, bun, vitest, jest.
2. **Python**: pip, poetry, uv, pytest.
3. **Go**: go modules, golangci-lint, go test.
4. **.NET / C#**: dotnet CLI, xUnit, nUnit.
5. **Flutter / Dart**: flutter test, flutter build web.
