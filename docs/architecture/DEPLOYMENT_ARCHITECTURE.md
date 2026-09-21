# Ryvix Deployment & CI/CD Integration Architecture

## 1. Core Principle: Working With Existing CI/CD

Ryvix is explicitly designed **not** to replace the customer's existing CI/CD pipelines, container registries, or deployment platforms (e.g., GitHub Actions, GitLab CI, Vercel, AWS CodePipeline, ArgoCD).

Instead, Ryvix functions as an autonomous contributor and post-deployment verifier within the customer's established release workflow.

---

## 2. Integrated Release & Verification Lifecycle

```
[ Ryvix Coding Workspace ]
  - Code changes applied & verified in sandbox
  - Ephemeral preview approved by user
       │
       ▼
[ Authorized Git Action ]
  - Ryvix opens Pull Request or commits to release branch
       │
       ▼
[ Customer CI/CD Pipeline (e.g. GitHub Actions) ]
  - Lints codebase
  - Executes customer end-to-end integration tests
  - Builds production container images
  - Deploys to Staging / Production environment
       │
       ▼
[ Ryvix Runtime Verification ]
  - Webhook notifies Ryvix: `deployment.status = SUCCESS`
  - Internal Connector monitors host metrics for 10 minutes:
    * Error rates (5xx HTTP responses)
    * Process restarts / crash loops
    * CPU / memory spikes
  - External Connector confirms endpoint health & SSL validity
       │
       ▼
[ Verification Conclusion ]
  - Health confirmed -> Mark Task `VERIFIED & COMPLETE`
  - Anomalies detected -> Open immediate diagnostic incident & notify customer
```

---

## 3. Webhook Integration & Status Checks

- **GitHub Check Runs**: Ryvix registers as a GitHub Check Provider. When a coding task is active, Ryvix updates GitHub PR check statuses (`pending`, `success`, `failure`).
- **Deployment Webhooks**: Customer CI/CD triggers a secure Ryvix webhook upon deployment completion with metadata:
  ```json
  {
    "event": "deployment_completed",
    "project_id": "proj_abc123",
    "environment": "production",
    "commit_sha": "9f21b8c...",
    "deployed_by": "github-actions[bot]"
  }
  ```
- **Automated Rollback Guidance**: If post-deployment verification detects critical failures, Ryvix immediately alerts the customer with an AI-generated explanation and a pre-compiled Git revert PR or rollback action for one-click execution.
