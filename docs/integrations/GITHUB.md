# GitHub Integration Specification

## Implementation checkpoint — 2026-10-02

The implemented release flow is preview/diff review → approved PR → explicit
owner/admin approval of the exact commit and target version → protected-branch
merge → existing customer CI/CD. Only a signed deployment event matching the
approved merge SHA and unchanged mapping enables result email. A PR or reachable
endpoint is not proof of deployment. Live end-to-end acceptance remains pending.

See the [current project status](../PROJECT_STATUS.md) for the
implemented scope, migration checkpoint, verification evidence and remaining work.
The specification below also includes target design; it is not evidence that
every described capability is implemented or live-verified.


## 1. Integration Scope & Architecture

Ryvix integrates with GitHub via a registered **GitHub App**. Using a GitHub App rather than personal access tokens ensures:
- Fine-grained repository permissions selected by the customer.
- Bot identity (`ryvix-bot[bot]`) on all commits, Pull Requests, and Check Runs.
- Short-lived installation access tokens (expiring after 60 minutes).
- Webhook subscriptions for real-time push, PR, and check-run tracking.

---

## 2. Permissions & Scopes Matrix

| Scope | Access Level | Rationale |
| :--- | :--- | :--- |
| **Repository Contents** | Read & Write | Read files for Project Analyzer; push verified commits to feature branches. |
| **Pull Requests** | Read & Write | Open automated PRs with diff summaries and preview links; track reviews. |
| **Commit Statuses / Checks**| Read & Write | Emit Ryvix verification check-runs (`ryvix/build-check`, `ryvix/test-check`).|
| **Issues** | Read & Write | Optionally link tasks to issues or create incident tracking tickets. |
| **Metadata** | Read-only | List repositories and branch names during customer onboarding. |

---

## 3. Webhook Handling & Lifecycle Events

Current implementation (ADR-016): `/api/webhooks/github` verifies bounded raw
JSON bodies using HMAC-SHA256 and persists `deployment_status` events. Ping is
acknowledged; other event types below are planned, not implemented by this route.
Only repositories reverified through the connection service receive events.
Configure a server-only random `GITHUB_WEBHOOK_SECRET` of at least 32 characters
and subscribe to deployment statuses on the authorized GitHub webhook/App.
Provider success is displayed as a provider observation, not verified runtime health.

Ryvix registers a webhook listener in the Backend API (`/api/webhooks/github`):
- `push`: Detects when code is deployed by developers or CI/CD to initiate runtime health verification.
- `pull_request`: Tracks when PRs opened by Ryvix are reviewed, approved, or merged.
- `installation`: Triggers onboarding sync when the app is installed or granted new repositories.

*Security*: Every webhook payload is verified using HMAC-SHA256 against `GITHUB_WEBHOOK_SECRET`. Unsigned or invalid requests are dropped immediately.
