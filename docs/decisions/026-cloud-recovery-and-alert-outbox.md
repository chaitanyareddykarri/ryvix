# ADR-026: Durable cloud recovery and P1 notification outbox

Cloud reboot is separate from native service commands. An authenticated requester
selects a registered server; a different current owner/admin approves. The exact
operator-allowlisted provider target is frozen in the request and rechecked at
dispatch. Worker credentials never enter the browser or AI. Requester and approver
membership are locked and revalidated at the dispatch linearization point.

A committed `dispatching` state precedes any external mutation. Dispatch is never
automatically retried after an ambiguous response or crash. Provider acceptance
is distinct from recovery evidence. Read-only verification requires provider
running state and a signed-agent heartbeat newer than dispatch; this demonstrates
post-request liveness, not proof of a reboot or application correctness. Three
attempts per target in 15 minutes and 60/300 second cooldowns bound repeats.

WhatsApp P1 alerts originate in tenant-scoped persisted incidents, not the legacy
global JSON alert ledger. Operator configuration binds existing connector IDs to
opted-in recipients and an approved template containing one incident-ID parameter.
The worker deduplicates incident/connector/recipient, commits a send claim, then
uses the connector's Vault token. Ambiguous sends are not retried automatically.
Signed Meta status callbacks update delivery state monotonically. No alert button
grants approval. Provider acceptance alone is never reported as delivery.

New tables deny browser access, enable RLS and record mutations in audit_events.
Deploy incremental migration before starting the dedicated worker. No cloud or
messaging mutations run during tests; provider clients are injected.
