# Ryvix Customer Onboarding Flow

## 1. Onboarding Journey Map

The onboarding experience guides a customer from initial account registration to active autonomous monitoring and coding support within minutes.

```
Customer
   │
   ▼
1. Create / Login to Ryvix Account (Supabase Auth via Email OTP or GitHub OAuth)
   │
   ▼
2. Connect GitHub Account / Organization
   │
   ▼
3. Select Specific Repositories & Grant Requested Scopes
   │
   ▼
4. Ryvix Establishes Secure Repository Connection
   │
   ▼
5. Project Analyzer Inspects Repository
   ├── Identifies languages (e.g. TypeScript, Python, Go)
   ├── Identifies frameworks (e.g. Next.js, FastAPI, Django)
   ├── Identifies package managers & build commands (e.g. pnpm build)
   └── Detects deployment clues (e.g. Dockerfile, fly.toml, vercel.json)
   │
   ▼
6. Customer Connects Infrastructure / Server
   ├── Internal Connector: Customer runs curl/bash or Docker enrollment command
   └── External Connector: Customer provides domain URL & optional cloud provider API key
   │
   ▼
7. Cryptographic Connector Enrollment & Handshake
   │
   ▼
8. Ryvix Begins Authorized Telemetry Streaming & Operational Readiness
```

---

## 2. Step-by-Step Walkthrough

### Step 1: Account Creation
- Supported methods: Magic Link / Email OTP (handled via high-reputation transactional SMTP) or one-click GitHub OAuth.
- Customer organization and initial project space initialized in Supabase.

### Step 2 & 3: GitHub Authorization
- Customer installs the Ryvix GitHub App on personal accounts or GitHub Organizations.
- Principle of Least Privilege: Customer explicitly selects specific repositories rather than granting blanket account-wide access.
- Scopes requested: Contents (Read/Write for coding), Pull Requests (Read/Write), Commit Statuses (Read/Write), Webhooks (Read).

### Step 4 & 5: Autonomous Project Analysis
- The **Project Analyzer** executes an automated static inspection of the root tree:
  - Scans `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`.
  - Builds the **Project Profile** stored in `projects.metadata`: language versions, build commands, test runners, and asset directories.

### Step 6: Server & Infrastructure Enrollment
- **Internal Agent Enrollment**: Ryvix generates a one-time enrollment token and curl command:
  ```bash
  curl -sSL https://get.ryvix.io | sudo bash -s -- --token enroll_tok_84a92c...
  ```
  The installer provisions the `ryvix-agent` systemd service with non-root permissions.
- **External Out-of-Band Setup**:
  - Customer enters primary public domain/endpoint (e.g., `https://api.myproject.com/health`).
  - Optional: Customer grants scoped cloud credentials (AWS IAM role ARN, DigitalOcean Read/Reboot token) to enable automated emergency recovery.

### Step 7: Live Readiness Verification
- Telemetry ingestion starts streaming live CPU/RAM/Disk stats to the Web Dashboard.
- External monitor confirms HTTP 200 health probe.
- Onboarding completes; Web Chat is unlocked for coding requests and operational commands.
