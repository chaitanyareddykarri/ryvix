# ADR-022: Verified channel transport and reviewed inbox

Gmail OAuth connects a mailbox to an authorized environment; refresh credentials
stay in Vault. Gmail messages and signed WhatsApp deliveries are untrusted task
proposals, not executable instructions or approvals. Transport authenticity does
not prove an email sender is a project member. Authorized users review proposals
in the web inbox before creating a repository job. No inbound text authorizes a
production action, PR, reboot or deployment.

Bindings, provider message IDs and proposals are durable. Duplicate delivery is
idempotent. Membership and connector status are checked again at acceptance.
Browser writes are revoked. OAuth mailbox polling is explicit and bounded; this
does not claim configured Pub/Sub delivery. Gmail authentication email delivery
is unaffected.
