# ADR 031: Authorized WhatsApp assistant

Opt-in verified links feed a durable, serialized conversation processor. Signed
provider timestamps determine the service window; duplicates never extend it.
Model output is untrusted structured advice. Backend checks scope again before
publishing replies or creating proposals. Coding requires a single-use expiring
confirmation bound to the user, link, repository and exact proposed prompt.

PR/release/server approvals use the existing authenticated web approval flows;
plain YES never grants approval. No model has credentials or executes commands.
Reply sends are claimed before contact, ambiguous outcomes are not retried, and
signed receipts reconcile early callbacks. Outside the service window only an
explicitly configured update template may be used for opted-in notifications.
Opt-out/unlink cancels queued work. Local fixtures never certify provider delivery.
