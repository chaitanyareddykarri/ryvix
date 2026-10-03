# Audit remediation, first batch — 2026-10-03

Addresses items 1–3 in [pending work](../PENDING_WORK.md). The original
[workspace audit](WORKSPACE_AUDIT_2026_10_03.md) remains a dated record of discovery.

- The experimental command-risk helper defaults unknown input to manual review.
  Destructive detection remains blocked even when followed by firewall/process
  patterns. Only an exact simple service-status syntax gets the legacy low-risk
  hint. Compound commands, substitution and redirection do not. Comments now state
  that no sandbox runs, port availability is unverified, and the hash is not an
  authorization signature. Production authorization remains separate.
- Fixture integration output no longer claims complete live end-to-end success.
  Optional localhost HTTP checks require RYVIX_TEST_LOCAL_HTTP=true, check that
  unauthenticated GET/POST requests receive 401, time out after five seconds, and
  propagate errors/assertion failures. These are not authenticated acceptance tests.
- Empty DPO batches return null loss/alignment/reward metrics with zero samples.
  Nonempty batch evaluation continues to return measured numeric calculations.

Regression coverage includes command composition and verdict precedence, empty
and nonempty evaluation, expected HTTP rejection, unexpected HTTP success and
transport failure. No harmful command is executed by these tests.

Verification: 80 project suites plus 15 Node checks passed; typecheck, lint and
production build passed. Secret scan: zero findings. All 56 checked local Markdown
links resolved.
All 12 original AI runtime files were restored with matching SHA-256 hashes.
Default test run explicitly skipped optional live HTTP checks; injected request
tests verified error propagation. No provider delivery or deployment was attempted.

Remaining work includes the development dependency advisory, reviewed/legacy
weight separation, legacy memory/graph consumer audit and real acceptance tests.
No database migration is required for this batch.
