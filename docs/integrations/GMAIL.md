# Gmail Integration Specification

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
- Gmail OAuth refresh tokens are stored encrypted in KMS-backed database records.
- The AI Model **never** receives raw Gmail access tokens or credentials.
- The Backend handles all reading and sending via scoped Google Workspace APIs.

---

## 3. Communication Patterns

1. **Outbound Notification Digests**:
   - Sent when requested tasks complete or when daily summaries are generated.
   - Formatted in clean HTML with clear status badges, unified diff snippets, and action links.
2. **Inbound Reply Processing**:
   - Customers can reply directly to notification threads (e.g., *"Deploy this now"*).
   - Inbound email webhook maps the sender address to an authenticated project user and enqueues a corresponding Task.
