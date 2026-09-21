# Gate 2: Hard-Coding & Extensibility Architecture Audit

## 1. Audit Scope & Objective

This audit examines the codebase for hardcoded vendor assumptions, rigid framework logic, and architectural lock-in across:
* AI/LLM providers & models
* Source-control platforms (GitHub vs. GitLab/Bitbucket)
* Communication channels (WhatsApp, Gmail, Web)
* Coding workspace runtimes (Node, Python, Go, Rust)
* Deployment targets (Vercel, AWS, Cloudflare, Fly.io)

---

## 2. Findings on Current Codebase

An automated AST and regex scan across all source code (`ai/`, `backend/`, `packages/`, `web/`) confirmed:
* **Zero Hardcoded Switch Statements**: There are no `switch (provider)` or `switch (stack)` blocks hardcoding execution branches in application code.
* **Legitimate Domain Union Types**:
  * `channel: 'web' | 'whatsapp' | 'gmail'`: Defined in `types.ts` and validated via PostgreSQL CHECK constraints. This reflects the core product specification.
  * `task_type: 'coding' | 'investigation' | 'operational' | 'recovery' | 'preview'`: Defined as a finite domain enum for the task state machine.

---

## 3. Extensibility Architecture: Planned Registries

To maintain extensibility as features are implemented across phases, Ryvix defines five architectural registries:

### 3.1 `ToolRegistry` (Phase 2 - Backend Core)
* **Purpose**: Decouples the AI reasoning loop from specific tool implementations.
* **Pattern**: Tools register a JSON Schema and an execution handler. The AI references tools by name (`repo.read_tree`, `workspace.generate_diff`); the registry validates arguments and routes to the appropriate provider.

### 3.2 `ModelProviderRegistry` (Phase 4 - AI Layer)
* **Purpose**: Abstract AI inference providers behind a common interface (`generate(prompt, tools) -> response`).
* **Providers**: Primary adapter for Hugging Face Inference Endpoints; fallback adapters for OpenAI / Anthropic / local llama.cpp gateways without altering backend orchestrator logic.

### 3.3 `WorkspaceProfileRegistry` (Phase 5 - Coding Sandboxes)
* **Purpose**: Eliminates hardcoded assumptions about programming languages and build commands.
* **Pattern**: Given detected stack tokens (`package.json`, `pyproject.toml`, `go.mod`), the registry selects a `WorkspaceProfile` (base Docker image, dependency install command, test command, preview dev command).

### 3.4 `ConnectorRegistry` (Phase 6-7 - Connectors)
* **Purpose**: Unifies distinct communication protocols (outbound TLS WebSocket for internal agents; HTTPS REST APIs for AWS/DigitalOcean out-of-band recovery).

### 3.5 `DeploymentAdapterRegistry` (Phase 10 - CI/CD & Release)
* **Purpose**: Listens to heterogeneous deployment webhooks (GitHub Actions, Vercel, ArgoCD) and normalizes them into canonical `deployment_completed` events.

---

## 4. Evaluation Matrix

| Domain Element | Current Implementation | Classification | Abstraction Required? | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Communication Channels** | `'web' \| 'whatsapp' \| 'gmail'` | Legitimate domain union | No | Low |
| **Task Statuses** | `'queued' \| 'planning' \| ...` | State machine enum | No | Low |
| **AI Tool Definitions** | `backend/src/tools/task-tools.ts` | Specific prototype tool | Yes -> `ToolRegistry` | **Phase 2** |
| **Inference Gateway** | `ai/src/orchestrator.ts` | Abstract planning contract | Yes -> `ModelProviderRegistry` | **Phase 4** |
| **Stack Runners** | Documented in `CODING_WORKSPACE.md`| Conceptual specification | Yes -> `WorkspaceProfileRegistry`| **Phase 5** |
