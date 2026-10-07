# Gmail Integration Specification

October 4 update: [current capability setup and limits](../infrastructure/CAPABILITY_PROVIDERS.md). Gmail push/reviewed replies, additional P1 transports, measured response usage, bounded semantic retrieval and separate external-training dataset preparation now have implementations. Prior descriptions of these features as wholly absent are superseded; provider verification and actual external training remain pending.


## Implementation status - October 7, 2026

Hosted migrations are applied through `20261007000001`; no numbered migrations
remain pending at the latest rollout. See [project status](../PROJECT_STATUS.md)
for completed UI, authentication, team, repository and fleet work and recorded
verification. The [pending queue](../PENDING_WORK.md) separates unfinished code,
deployment configuration and live acceptance. Design details below describe
scope, not production certification.

## 1. Scope & Functional Boundaries

Gmail functions as an **asynchronous customer communication channel** for Ryvix. Customers can connect their authorized Google Workspace or personal Gmail account to receive task notifications, daily summaries, and reply with instructions.

---

## 2. Strict Architectural Invariants

### 2.1 Separation from Transactional Auth Delivery
> [!IMPORTANT]
> **Gmail OAuth is NOT the Authentication Email Provider**:  
> Personal or Workspace Gmail accounts must **never** be used to send user authentication OTPs, account activation emails, or password reset tokens.  
> Ryvix authentication emails are delivered strictly via dedicated high-reputation transactional infrastructure (e.g., SendGrid, Postmark, AWS SES) configured in `.env.example`.

### 2.2 Token Protection
- Gmail OAuth refresh tokens are stored in the existing Supabase Vault architecture.
- The AI Model **never** receives raw Gmail access tokens or credentials.
- The Backend handles all reading and sending via scoped Google Workspace APIs.

---

## 3. Planned communication patterns (not implemented)

1. **Outbound Notification Digests**:
   - Sent when requested tasks complete or when daily summaries are generated.
   - Formatted in clean HTML with clear status badges, unified diff snippets, and action links.
2. **Inbound Reply Processing**:
   - Customers can reply directly to notification threads (e.g., *"Deploy this now"*).
   - Inbound email webhook maps the sender address to an authenticated project user and enqueues a corresponding Task.

## Scheduled Gmail continuation

Optional npm run worker:gmail polls explicitly allowlisted connected accounts.
It preserves reviewed task intake and requires current owner/admin authorization.
See [Gmail worker setup](../infrastructure/GMAIL_POLLING.md). Real Google acceptance is still required.
