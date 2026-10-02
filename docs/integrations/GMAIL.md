# Gmail Integration Specification

## Implementation checkpoint — 2026-10-02

Gmail uses read-only OAuth polling into a reviewed inbox. WhatsApp supports signed
inbound proposals and durable P1 template alerts with signed receipts. Full
two-way WhatsApp LLM chat, mobile approvals, Gmail push and replies remain future
work. Security/deployment email uses Resend to the confirmed account address,
including Gmail recipients; receiving it does not require Gmail OAuth.

See the [current project status](../PROJECT_STATUS.md) for the
implemented scope, migration checkpoint, verification evidence and remaining work.
The specification below also includes target design; it is not evidence that
every described capability is implemented or live-verified.


> Account security/deployment notifications now support Gmail recipients through
> the application's Resend sender; see `../infrastructure/EMAIL_AND_RELEASES.md`.
> This does not grant Gmail mailbox sending access or implement conversational
> replies. Existing Gmail OAuth remains the separate read-only task inbox.

> Current implementation: see ../infrastructure/CHANNELS_AND_LEARNING.md and
> ADR-022. OAuth polling feeds a reviewed inbox. The historical automatic
> sender-to-task flow below is not enabled; email text cannot authorize actions.

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
