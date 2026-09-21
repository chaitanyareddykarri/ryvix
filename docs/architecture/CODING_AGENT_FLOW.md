# Ryvix Coding Agent Workflow Specification

## 1. End-to-End Autonomous Coding Flow

This document details the step-by-step lifecycle when a user asks Ryvix to implement a feature, fix a bug, or update an existing software project.

```
[ 1. User Coding Request ]
  e.g., "Add a dark mode toggle to the top navigation bar"
       │
       ▼
[ 2. Context Assembly & Project Analysis ]
  - Fetch repo structure, detected stack, active branch
  - Ingest relevant source files (e.g. `Navbar.tsx`, `tailwind.config.js`)
       │
       ▼
[ 3. AI Planning & Strategy Formulation ]
  - AI generates phased plan: files to create, files to modify, build commands
  - AI identifies: "This is a frontend UI change requiring preview"
       │
       ▼
[ 4. Execution Mode Selection ]
  - Needs build/test verification? -> Route to Ephemeral Coding Workspace
       │
       ▼
[ 5. Workspace Provisioning & Code Modification ]
  - Clone repo branch
  - Apply AST/diff edits to source files
  - Run `pnpm build` -> Checks for compiler errors
  - Run `pnpm test` -> Checks for test regressions
  - If errors occur: Feed compiler errors back to AI for auto-correction (max 3 loops)
       │
       ▼
[ 6. Frontend Preview Generation ]
  - Spin up preview bundle or ephemeral dev server
  - Generate temporary isolated URL: `https://preview-task-492.ryvix.preview`
       │
       ▼
[ 7. Customer Review & Policy Approval ]
  - Present unified diff + preview link to user in Web Chat or WhatsApp
  - User inspects visual change and clicks: [Approve & Deploy]
       │
       ▼
[ 8. Authorized Git Commit & PR Creation ]
  - Ryvix Backend commits change to feature branch or opens Pull Request
  - Zero raw tokens exposed; Git operations signed by Ryvix App bot
       │
       ▼
[ 9. Customer CI/CD Build & Deployment ]
  - Customer's existing GitHub Actions / Vercel pipeline builds & deploys
       │
       ▼
[ 10. Post-Deployment Runtime Health Verification ]
  - Internal & External Connectors monitor production error rates & latency
  - Confirm system is HEALTHY post-deployment -> Task Marked Complete
```

---

## 2. Feedback Loops & Self-Healing During Modification

If the code modification results in compiler or unit test errors in the isolated workspace:
1. **Error Capture**: Capture structured stdout/stderr, line numbers, and stack traces.
2. **Self-Correction Invocation**: Prompt the AI Model with the original diff, the error trace, and target file contents.
3. **Loop Bound**: The self-correction loop is capped at **3 iterations** to prevent infinite token consumption. If the build does not succeed within 3 attempts, the task transitions to `FAILED` with detailed diagnostic reports.

---

## 3. Human Approval Gate Enforcement

Ryvix strictly enforces human oversight before production impact:
- Previews and sandboxed builds run automatically.
- **Git pushes to protected branches, Pull Request merges, or production deployment triggers CANNOT execute without explicit customer approval.**
- Customer approval is captured via cryptographically signed JWT tokens emitted from the Web Chat UI or authenticated WhatsApp callback actions.
