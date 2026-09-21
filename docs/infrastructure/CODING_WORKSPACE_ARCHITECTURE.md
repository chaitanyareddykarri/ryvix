# Coding Workspace Architecture & Sandbox Isolation

## 1. Core Invariant

**Customer source code, dependency scripts, build jobs, and test suites must never execute directly inside the main Ryvix backend process or host operating system.**

Ryvix provisions short-lived, isolated, stack-aware Docker container sandboxes to execute code modifications, compilations, test runs, and ephemeral previews.

---

## 2. End-to-End Workspace Lifecycle

```
                  Customer Repository (GitHub)
                               │
                               ▼
                    1. REPOSITORY ANALYZER
             Inspects package manifests, configs & AST
                               │
                               ▼
                      2. STACK DETECTOR
          Identifies languages, frameworks & build tools
                               │
                               ▼
                 3. WORKSPACE PROFILE SELECTION
            Resolves target runtime image & commands
                               │
                               ▼
                 4. DOCKER SANDBOX CREATION
          Provisions ephemeral container with cgroups
                               │
                               ▼
                     5. REPOSITORY MOUNTING
          Mounts repo in isolated non-root filesystem
                               │
                               ▼
                   6. DEPENDENCY INSTALLATION
             Runs isolated npm, pip, dotnet install
                               │
                               ▼
                     7. AI CODE MODIFICATION
             Applies approved AST diffs & code edits
                               │
                               ▼
                       8. BUILD & TESTING
             Executes compilation and test runners
                               │
                               ▼
                 9. EPHEMERAL FRONTEND PREVIEW
             Binds container port to preview proxy
                               │
                               ▼
                     10. TEARDOWN & CLEANUP
            Container and ephemeral volumes shredded
```

---

## 3. Profile-Driven Workspace Stacks

Ryvix avoids bloated "monolithic" images containing every language SDK. Environments are **profile-driven**:

| Stack Profile | Detection Heuristics | Base Image | Package Manager | Build & Test Runners |
| :--- | :--- | :--- | :--- | :--- |
| **Node / Next.js** | `package.json`, `tsconfig.json` | `node:22-alpine` | `npm`, `pnpm`, `yarn` | `npm run build`, `npm test` |
| **Python** | `pyproject.toml`, `requirements.txt` | `python:3.12-slim` | `pip`, `poetry` | `pytest`, `python -m unittest` |
| **.NET** | `*.csproj`, `*.sln` | `mcr.microsoft.com/dotnet/sdk:8.0` | `dotnet restore` | `dotnet build`, `dotnet test` |
| **Flutter / Dart** | `pubspec.yaml` | `ghcr.io/cirruslabs/flutter:stable` | `flutter pub get` | `flutter build web`, `flutter test` |
| **Go** | `go.mod` | `golang:1.23-alpine` | `go mod download` | `go build ./...`, `go test ./...` |
| **Rust** | `Cargo.toml` | `rust:1.80-slim` | `cargo fetch` | `cargo build`, `cargo test` |

---

## 4. Sandbox Isolation & Security Limits

1. **Non-Root User**: Sandboxes execute strictly as an unprivileged user (`UID 1000` / `USER sandbox`). Root access is stripped.
2. **CPU & Memory Quotas (cgroups)**:
   - Max 2 vCPUs (`cpu.cfs_quota_us`).
   - Max 4GB RAM (`memory.max`). Out-of-memory cascades terminate the container cleanly without impacting the host.
3. **Execution Timeout**:
   - Hard execution ceiling of **15 minutes per task**. Containers exceeding this threshold are forcefully evicted.
4. **Network Restrictions**:
   - Egress is restricted to public package registries (`registry.npmjs.org`, `pypi.org`, `nuget.org`).
   - Access to Ryvix internal networks, cloud metadata endpoints (`169.254.169.254`), and local VPCs is blocked via iptables.
5. **No Docker Socket Mounting**:
   - `/var/run/docker.sock` is **NEVER** mounted inside customer coding sandboxes, preventing container breakout attacks.

---

## 5. Ephemeral Previews & Cleanup

- When a frontend change is verified, an internal HTTP server boots on an assigned container port.
- Ryvix routes requests through a wildcard preview subdomain (`preview-<task_id>.preview.ryvix.internal`).
- Upon user approval or rejection (or after a 30-minute idle TTL), the preview container and all temporary volumes are purged.

---

## 6. Failure & Crash Handling

- **Compilation / Test Failures**: Captured stdout and stderr are returned to the AI reasoning loop for re-planning and automated error repair.
- **Hung Process / Infinite Loops**: Enforced via container timeout (15m) and SIGKILL signals.
- **Crash Eviction**: If a container exits with an unhandled exception, Ryvix captures the core dump, cleans up the volume, and returns a structured failure report.
