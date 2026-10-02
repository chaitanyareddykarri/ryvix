# Ryvix GitHub & Credential Security Specification

## Implementation checkpoint — 2026-10-02

Settings authorization and mutation share a locked transaction. GitHub execution
uses project-scoped Vault credentials and chat usage has durable quotas. Signed
agent security reports persist measured observations; opted-in users can receive
Resend emails at their confirmed account address. A trusted detector must supply
reports; this does not install a WAF. Server actions and releases require their
explicit persisted approval workflows.

See the [current project status](../PROJECT_STATUS.md) for the
implemented scope, migration checkpoint, verification evidence and remaining work.
The specification below also includes target design; it is not evidence that
every described capability is implemented or live-verified.


## 1. Threat Model & Security Boundaries

Ryvix operates across two sensitive boundaries: customer source code repositories on GitHub and live customer production servers. The system enforces strict architectural separation between these two environments.

| Asset | Storage Location | Accessibility |
| :--- | :--- | :--- |
| **GitHub OAuth Tokens** | Server-side HTTP-Only Cookies (`gh_session_token`) | Never accessible to browser JavaScript; never exposed in API JSON bodies. |
| **GitHub App Private Key** | Secure environment variables (`GITHUB_APP_PRIVATE_KEY`) | Server-side only; used exclusively to mint short-lived JWTs. |
| **Supabase Service Role** | Server-side environment variables (`SUPABASE_SERVICE_ROLE_KEY`) | Never provided to frontend client; only used in trusted server endpoints. |
| **Server SSH Keys** | Ephemeral memory during keypair generation; user-owned | Never stored in plain text; agentless pathways favor in-band outbound daemons. |
| **AI Prompt Context** | In-memory LLM payload | Scanned and sanitized; all `.env` and credential files are stripped. |

---

## 2. AI Model Execution Guardrails

Under no circumstances is an AI model allowed to directly interact with the GitHub API or the customer's production host:
1. **User Request**: User sends natural language prompt ("Update checkout hero banner").
2. **AI Reasoning**: AI generates a structured `Plan` containing discrete `PlanStep` items.
3. **Backend Authorization**: Backend validates the plan against tenant policies. High blast-radius operations require human approval (`approval_requests`).
4. **Sandbox Execution**: Code changes are synthesized in an isolated Docker container with cgroup resource ceilings (2 vCPUs, 2048MB RAM, 15m timeout).
5. **Git Pipeline**: Only approved, verified file diffs are committed to a feature branch (`ryvix/task-...`) and submitted as a GitHub Pull Request.

---

## 3. Secret Detection & Prevention

During repository onboarding analysis (`/api/github/repositories/analyze`), the file tree is scanned for sensitive credentials:
- Environment files: `.env`, `.env.local`, `.env.production`, `.env.staging`
- Private keys: `id_rsa`, `id_ed25519`, `*.pem`, `*.key`
- Service accounts: `credentials.json`, `service-account*.json`

**Policy**:
- Ryvix **never** reads or outputs the contents of these files.
- The UI raises a non-intrusive warning: *"Potential secret file detected in repository. Please ensure secrets are managed via environment variables and added to .gitignore."*
- Uncommitted secrets are never committed into git history by Ryvix.

---

## 4. Multi-Tenant Scoping & RLS

All GitHub connections and repository records are bound to the customer's `organization_id`:
- Repository queries enforce `WHERE project_id IN (SELECT id FROM projects WHERE organization_id = $orgId)`.
- Workspace sessions enforce `expires_at > NOW()` and project isolation.
- Cross-tenant data leakage is prevented at both the application layer and PostgreSQL Row-Level Security (RLS) policies.
