# Ryvix Non-Coder Website Onboarding Architecture

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
