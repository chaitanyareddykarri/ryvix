# Ryvix Product Coding Workflow

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
