# ADR-005: Ephemeral Stack-Aware Coding Workspaces vs. Direct Repository Workflows

## Context
Autonomous code modifications range from trivial documentation edits to complex refactorings requiring dependency compilation, automated unit tests, and live frontend preview generation. Running full containerized development environments for every simple file edit creates unnecessary latency and compute costs, while modifying files without testing introduces build regressions.

## Decision
Support two distinct, adaptive workflows:
1. **Direct Repository Workflow**: For lightweight changes (markdown docs, config files, minor text replacements), Ryvix directly commits via the GitHub API without spinning up a compute sandbox.
2. **Ephemeral Isolated Workspace**: For complex code modifications, Ryvix dynamically provisions a containerized sandbox matching the detected project stack (Node, Python, Go, Rust), executes builds and tests, runs preview servers, and destroys the container upon completion.

## Consequences
- **Positive**: Sub-second execution for trivial changes; complete safety, compiler verification, and visual preview generation for application code changes.
- **Negative**: Requires maintaining stack-specific base container images and dynamic provisioning infrastructure.

## Alternatives Considered
- **Persistent Always-On Workspaces (e.g. dev containers per repo)**: Rejected due to prohibitive idle cloud costs.
- **Direct Commits Only (No Sandboxing)**: Rejected because unverified code edits would break customer production builds.
