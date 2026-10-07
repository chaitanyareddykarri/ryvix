# Ryvix GitHub Integration Architecture

## Implementation status - October 7, 2026

Hosted migrations are applied through `20261007000001`; no numbered migrations
remain pending at the latest rollout. See [project status](../PROJECT_STATUS.md)
for completed UI, authentication, team, repository and fleet work and recorded
verification. The [pending queue](../PENDING_WORK.md) separates unfinished code,
deployment configuration and live acceptance. Design details below describe
scope, not production certification.

## 1. Architectural Scope & Dual Gateway Model

Ryvix integrates with GitHub to provide source-code level awareness, continuous deployment status tracking, and automated Pull Request generation. To ensure enterprise flexibility and zero-friction developer setup, Ryvix supports a **Dual Gateway Model**:

1. **GitHub App (Recommended for Production)**:
   - Uses fine-grained, repository-scoped permissions.
   - Employs bot author identity (`ryvix-bot[bot]`) for automated commits and PRs.
   - Issues short-lived installation access tokens expiring after 60 minutes.
   - Subscribes to real-time Webhooks with cryptographic HMAC-SHA256 signatures.

2. **GitHub OAuth Flow (Web Dashboard Onboarding)**:
   - Provides 1-click authorization for non-coders without manual token creation.
   - Requests least-privilege scopes (`repo`, `read:org`, `user:email`).
   - Exchanges authorization code via server-side TLS and stores the access token in an `httpOnly`, `secure`, `SameSite=Lax` session cookie.

---

## 2. Token Security & Privilege Isolation

```
[ Customer Browser ]
       │  (No GitHub tokens stored in localStorage or accessible via JS)
       │  HTTP-Only, Secure Session Cookie (gh_session_token)
       ▼
[ Ryvix Next.js Backend / API Gateway ]
       │
       ├─► [ GitHub REST API ] (HTTPS with Bearer Token)
       │     - Git Tree inspection (Read)
       │     - Manifest parsing (Read)
       │     - Atomic branch creation (Write to ryvix/*)
       │     - Pull Request creation (Write)
       │
       └─► [ PostgreSQL / Supabase ]
             - Repository installations linked to organization_id
             - Repositories linked to project_id
             - Audit event logging
```

### Critical Security Boundaries
- **Zero Client Exposure**: GitHub access tokens, refresh tokens, and installation secrets are never sent to client-side JavaScript.
- **Zero LLM Secret Injection**: Large Language Model context builders are strictly isolated from GitHub credentials. The AI generates diffs and plans; the backend securely commits them via authenticated APIs.
- **Least Privilege Branch Protection**: Pushes to `main` or `master` are strictly disallowed. Ryvix creates isolated working branches (`ryvix/task-...`) and submits Pull Requests for human operator review.

---

## 3. Real-Time Repository Analysis Engine

When a website repository is selected, Ryvix invokes the live inspection engine (`/api/github/repositories/analyze`):
1. **Tree Resolution**: Retrieves the repository Git Tree via `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1` (capped at 2,000 files).
2. **Manifest Parsing**: Downloads project manifests (`package.json`, `pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`).
3. **Stack Resolution**: Resolves framework (Next.js, Vite/React, FastAPI, Django, Go Gin, Rust Axum), build commands, test commands, and entry points.
4. **CI/CD Detection**: Inspects `.github/workflows/`, `vercel.json`, `netlify.toml`, and Dockerfiles.
5. **Secret Guardrail Scanning**: Flags committed `.env`, `.pem`, or key files as warnings without revealing content.

---

## 4. Webhook Tamper Resistance

All incoming webhooks at `/api/webhooks/github` are authenticated using HMAC-SHA256:
```ts
const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
const valid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
```
Tampered or unsigned requests are immediately dropped with HTTP 401.
