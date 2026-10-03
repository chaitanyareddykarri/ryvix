# Audit follow-up: offline isolation, context and Gmail

Continues the [first fixes](AUDIT_REMEDIATION_2026_10_03.md).

## Changes

- Production no longer auto-loads ai/data neural weight files, even with a custom
  legacy weight path. Reviewed project checkpoints continue to instantiate/load
  their own classifier through the authorized experience collector. Synthetic
  training entry points reject production use. CI labels this training as offline
  synthetic regression, not production model promotion.
- Legacy semantic/long-term memory skips disk loading in production and rejects
  read/write operations there. The legacy OODA entry point rejects production use.
  Production web chat keeps using tenant-scoped database memory and reviewed lessons.
- Topology defaults to an empty graph. Only explicit test setup seeds the shared
  fixture graph; production rejects synthetic seeding. The method's historical name
  is retained for compatibility, not as a claim that its fixtures are live data.
- Checked production consumer references: conversationalAgent, cognitiveMemory,
  trajectoryDpoTuner and the seeded singleton appeared as compatibility exports in
  services/src/index.ts, not calls in current web/backend/worker entry points.
  Exports were retained; this is quarantine and consumer review, not blind deletion.
- Coding context follows local JS/TS imports from ranked source files, up to 24
  files, 32 KB each and 160 KB total. It checks actual bytes and excludes traversal,
  secret paths and generated/vendor directories. This remains bounded context;
  arbitrary-language dependency graphs remain unsupported.
- Failed test/typecheck/build verification can request one bounded correction using
  sanitized failure output and reread current files. All checks rerun afterward;
  another failure fails the task. Install/transport failures are not retried this
  way. Saved final verification retains prior attempt summaries without raw logs.
  This is one repair attempt, not an open-ended autonomous loop.
- Added explicit-allowlist Gmail scheduling with current-account authorization,
  advisory-lock coordination, graceful stop and bounded existing provider reads.
  See [setup](../infrastructure/GMAIL_POLLING.md). No schema migration is needed.
- Worker service examples now specify NODE_ENV=production. Do not override it
  with development values in production environment files.

## Verification and limits

Final checks: 81 project suites and 15 Node checks passed; typecheck, lint and
production build passed; secret scan found zero issues. All 80 checked local
Markdown links resolved. Original 12 runtime files were restored and hash-verified.
The fresh read-only runtime probe connected successfully and found no missing
migrations, but readiness still fails because local model, public URL, preview,
workspace-image/host and agent-release settings are missing. Remote secret stores
were not inspected. These checks do not establish provider delivery or model quality.

New tests launch a production-mode subprocess to check the weight/memory/seed
guards, exercise scheduler authorization/lock/error paths with injected providers,
and verify import-neighbor inclusion and actual-byte context limits.

Real SMTP/Meta/Google delivery, authenticated browser acceptance, deployed workers,
customer releases/recovery and representative training quality remain unverified.
No external account, message, reboot, migration or synthetic dataset was created.

The development dependency advisory remains unresolved: the installed dependency
chain depends on braces, and the registry's latest braces version is still affected.
The inspected newer Next 15 ESLint plugin still uses fast-glob. No unsafe major
downgrade or silent vulnerability suppression was applied. Production-only npm
audit was clean in the preceding audit; that does not remove development exposure.

Use [pending work](../PENDING_WORK.md) for remaining requirements. Full completion
cannot be asserted without deployment inputs, real acceptance and reviewed data.
