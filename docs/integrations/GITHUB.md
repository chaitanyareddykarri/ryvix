# GitHub Integration Specification

## Implementation checkpoint — 2026-10-03

Code checkpoint: `d81b281`; applied migrations through `20261003000004`.
Implemented: reviewed experience/personal memory, bounded repository indexing,
Gmail SMTP email, WhatsApp OTP identity, opt-in AI replies/history/quotas, confirmed
coding requests, task notifications and authenticated approval handoffs. Releases
and server operations retain their existing web authorization and approval checks.
Recorded verification: 79 project suites plus 15 Node checks, typecheck/lint/build
and 125 database boundary checks passed. Provider delivery, deployed workers/browser
acceptance and representative model accuracy remain unverified.

See [project status](../PROJECT_STATUS.md), [assistant setup](../infrastructure/WHATSAPP_ASSISTANT.md) and
[recorded verification](../verification/WHATSAPP_ASSISTANT_2026_10_03.md). This documentation update did not rerun those
code checks. Detailed designs below may include planned capabilities; the status
index distinguishes implemented behavior from future work.


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
