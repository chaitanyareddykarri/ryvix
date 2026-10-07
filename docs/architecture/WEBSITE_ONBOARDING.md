# Ryvix Non-Coder Website Onboarding Architecture

## Implementation status - October 7, 2026

Hosted migrations are applied through `20261007000001`; no numbered migrations
remain pending at the latest rollout. See [project status](../PROJECT_STATUS.md)
for completed UI, authentication, team, repository and fleet work and recorded
verification. The [pending queue](../PENDING_WORK.md) separates unfinished code,
deployment configuration and live acceptance. Design details below describe
scope, not production certification.

## 1. Design Philosophy: Zero-Friction for Non-Coders

Ryvix targets business owners, product teams, and non-technical operators who manage production websites. The onboarding experience completely abstracts away developer concepts:
- **No Git concepts**: No manual branching, merge conflicts, or commit hashes shown during onboarding.
- **No tokens or keys**: 1-click GitHub authorization without copying OAuth scopes or installation IDs.
- **No CI/CD configuration**: Automatic detection of existing deployment workflows (Vercel, GitHub Actions, Docker).
- **No required server setup**: Live server monitoring via the lightweight connector is an optional enhancement, not a blocker.

---

## 2. The 5-Step Non-Coder Journey

```
Step 1: Connect Website
  - "Connect GitHub so Ryvix can understand, monitor, and manage your website."
  - Single primary [ Connect GitHub ] button
       │
       ▼
Step 2: Choose Website
  - "Select the website or project you want Ryvix to manage."
  - Searchable list of website cards with framework tags
  - Single click on website card to proceed
       │
       ▼
Step 3: Automatic Inspection (Real-Time Progress)
  - Animated visual feedback while backend analyzes repo:
    ✓ GitHub connected
    ✓ Repository found
    ✓ Reading project structure
    ✓ Detecting technology
    ✓ Checking dependencies
    ✓ Detecting deployment configuration
    ✓ Checking application configuration
       │
       ▼
Step 4: Website Connected Summary
  - Confirmation card:
    * Website: my-company-website
    * Technology: Next.js (App Router)
    * Deployment: Detected (GitHub Actions)
    * GitHub: Connected (@owner)
  - Action: [ Open Workspace → ]
       │
       ▼
Step 5 (Optional): Connect Server
  - "Ryvix can monitor your server, detect problems and help recover your website."
  - 1-line curl command with instant copy button
  - Outbound HTTPS only (no open inbound firewall ports)
```

---

## 3. Database Persistence & Auditability

Upon confirmation in Step 4, the repository is enrolled in PostgreSQL:
- `project_id`: Linked to the customer's organization project.
- `detected_stack`: Populated with real detected frameworks (e.g., `['nextjs', 'typescript']`).
- `build_command`: Set to verified build command (`npm run build`).
- `test_command`: Set to verified test runner (`npm test`).
- `audit_events`: Emits an immutable audit log entry documenting connection time, actor, and detected CI/CD pipeline.
