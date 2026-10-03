# Ryvix Product Coding Workflow

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


## 1. Overview

Ryvix enables users to request software modifications directly through conversational prompts. Whether fixing a broken layout, updating dependencies, or implementing a new feature, Ryvix orchestrates the entire development, verification, and deployment lifecycle.

---

## 2. Detailed Workflow Stages

### Stage 1: Intent Interpretation & Repository Contextualization
- The customer submits a prompt (e.g., *"Fix the mobile navigation drawer so it closes when an item is tapped"*).
- Ryvix queries the Project Analyzer data in Supabase:
  - Framework: React / Next.js
  - File tree: Identifies `components/Navigation/MobileDrawer.tsx`
  - Style system: Tailwind CSS

### Stage 2: Planning & Safety Evaluation
- The AI Model formulates a modification plan:
  1. Inspect `components/Navigation/MobileDrawer.tsx`.
  2. Add `onClick={() => setIsOpen(false)}` to navigation item wrappers.
  3. Run typecheck (`pnpm tsc`) and unit tests (`pnpm test`).
  4. Spin up temporary preview.

### Stage 3: Workspace Execution & Build Verification
- An ephemeral workspace container checks out a new branch `ryvix/fix-mobile-drawer`.
- The code edit is applied via unified diff.
- Automated verification runs:
  - TypeScript compiler executes: `0 errors`.
  - Vitest test suite executes: `12 passed, 0 failed`.

### Stage 4: Frontend Preview
- An isolated ephemeral preview URL is provisioned (`https://preview-task-902.ryvix.preview`).
- The customer interacts with the modified application in real-time inside the Web Chat iframe before any code touches the main branch.

### Stage 5: Customer Approval & Production Hand-off
- The customer clicks **"Approve & Merge"**.
- Ryvix commits the verified changes, opens a Pull Request on GitHub, and marks it ready for customer CI/CD.
- Once the customer's CI/CD deploys the code, Ryvix verifies production runtime health via the internal connector.
