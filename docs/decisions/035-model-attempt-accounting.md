# ADR 035: Durable streaming provider attempts

Web chat, WhatsApp assistant and Gmail reply drafting persist an authorized attempt
before calling a streaming provider. Each fallback has its own UUID. Completion,
failure and cancellation record duration and whatever token usage was reported.
Unavailable counts remain null; partial counts are explicitly not a final charge.
A process crash leaves `started`, meaning unknown outcome rather than zero usage.

The initial source must be owned and active; completion updates only the exact
previously recorded organization/user/channel/source tuple. Revocation after a
provider call does not prevent recording its existing attempt's cost evidence.
Read access always rechecks current membership and returns only the user's records.
No prompts, answers or credentials are stored. RLS is enabled and browser table
privileges are revoked in migration `20261005000001`.

This ledger covers these streaming paths, not all embedding/nonstream calls or
provider invoices. Existing successful-response usage fields remain compatible.
Unknown attempts must not be silently interpreted as free or retried automatically.
