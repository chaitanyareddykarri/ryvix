# Self-learning continuation

The legacy anomaly-learning method has no callers in the backend, services or
web source trees. Tests and training demonstrations were its callers. Its
presence does not establish continuous learning from production telemetry.

This checkpoint requires a real provider for novel anomaly diagnoses, validates
bounded JSON fields, rejects deterministic fallback output, and sanitizes prompt
and stored text. Previously malformed output silently became a canned quarantine
diagnosis and was persisted with claimed 95% confidence. Invalid output now fails
before memory writes. Existing stored patterns were preserved, not certified.

Offline training no longer clears runtime pattern memory to run a provider
demonstration. It explicitly skips that check. Training reports are synthetic
fixture results, not unseen-data accuracy. The convergence unit test now uses an
isolated classifier because an already-converged saved checkpoint can have zero
loss before the test starts.

Verification: 68 project suites and 15 Node checks passed; workspace typecheck
passed; both offline training scripts completed. The anomaly regression uses
explicit provider fixtures, not a live model. Runtime data is restored after
checks and excluded from the checkpoint.

## Pending learning work

- Backend-owned, tenant/project-scoped candidate and approved-pattern storage.
  The legacy global file store must not be connected to tenant production traffic.
- Verified remediation outcomes or authorized review before promoting diagnoses.
  Valid JSON alone is not correctness. The legacy path still auto-caches valid
  provider output and its 0.95 confidence is not calibrated accuracy.
- Quarantine/review of historical patterns; do not silently trust old canned data.
- Durable event ingestion and learning worker, deduplication and retry handling.
- Shared checkpoint storage, atomic publication, versioning and rollback.
- Observable persistence failures: the legacy file store swallows write errors.
- Separate real training, validation and held-out datasets, drift monitoring,
  regression gates and controlled promotion. No live accuracy score is available.
- Audited feedback collection from chat and coding outcomes. Saving messages or
  exporting JSONL does not fine-tune the external LLM.

## Other AI/chat work still pending

- Live provider/model verification and answer-quality evaluation.
- Current-repository retrieval, authorized semantic/graph retrieval integration.
- Conversation archive and reload recovery UI.
- Real authenticated browser verification beyond SQL role/ownership fixtures.

See AI_UPGRADE_2026_10_01.md for implemented chat features and limits, and
PRODUCTION_REMEDIATION.md for broader deployment and connector work.
