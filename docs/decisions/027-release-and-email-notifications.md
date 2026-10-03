# ADR-027: Explicit releases and account email notifications

An authorized owner/admin explicitly approves merging the displayed task PR head
into its existing base branch. GitHub branch protection and a clean merge state
are required. This starts the customer's existing CI/CD; it does not create a new
deployment pipeline or claim success. A durable release record binds the approved
head, task, target environment and provider merge SHA. Ambiguous merges are never
automatically repeated. Reconciliation is read-only.

Users opt into environment notifications to their confirmed account email (Gmail
addresses work without Gmail OAuth). A separate Resend notification adapter uses
a verified sender and a server-only key. Auth OTP delivery is unchanged. Messages
contain event references and application links, not raw attack logs or secrets.

The operations worker queues persisted non-dismissed security events and security
incidents after opt-in. Deployment email requires a signed GitHub deployment event
matching an approved release's actual merge SHA and configured environment. A
success webhook is described as provider-reported success; runtime health and
executing-commit proof remain separate observations. Failure emails use distinct
wording. Queue deduplication and provider idempotency keys bound repeat delivery.
Unknown sends are retained without automatic retries. Membership, verified email,
preferences and source scope are checked again when claiming a send.

New tables enable RLS and deny direct browser access. Preferences, release actions
and notification mutations are audited. Actual account sends and cloud mutations
require configured providers and designated live targets.

## Transport supersession — 2026-10-03

Commit 4d1369a changes the default notification transport to the operator's Gmail
SMTP and shares it with application OTP mail. Resend is only an explicitly selected
optional adapter, never an automatic fallback. Hosted Supabase Auth mail settings
remain separate. The original release authorization and deployment correlation
decisions above remain applicable. See [current setup](../infrastructure/WHATSAPP_ASSISTANT.md).
