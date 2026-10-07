# Local remediation checkpoint before phone onboarding

> Historical checkpoint: later implementation and applied-migration status are
> recorded in [current status](../PROJECT_STATUS.md), [pending work](../PENDING_WORK.md)
> and the [October 7 rollout](MIGRATIONS_2026_10_07.md). Original findings and test
> results below describe this report's checkpoint, not the current pending queue.

The user stopped the general remediation phase and requested WhatsApp phone
onboarding next. Existing changes are preserved, not committed or pushed.

Completed locally:
- Responsive fixes for landing navigation/footer, dashboard controls, chat,
  populated Tasks/Gmail, and scrollable observability logs.
- Task verification and PR labels now use persisted records; dashboard empty
  states no longer claim completed execution or live health.
- Permanent browser harness CSS/alias fixes and 122 additional browser cases.
- Bounded inherited TypeScript configuration resolution from repository snapshots,
  including missing/cyclic config and override regression cases.

Latest recorded checks: 86 application suites and 24 Node tests passed offline;
12 AI runtime files restored. Typecheck and lint passed. Production build passed
before the inherited-config change; its subsequent typecheck/offline checks passed.
Browser run: 139 passed, one page-setup timeout; the exact case passed on rerun.
These are component/fixture checks, not real-provider or physical-phone acceptance.

A scoped tinyglobby replacement for Next lint's fast-glob dependency was tried
and reverted because Windows absolute-root discovery failed. The regression is
retained. Five development-chain advisory findings remain; no clean audit claimed.

Pending general work, suspended for the new phase:
1. Actual Next route/hydration acceptance, broader error/interaction/accessibility
   cases, physical iOS/Android keyboard checks.
2. Compatible development dependency advisory remediation.
3. Additional language parsers and whole-repository compiler graphs.
4. Account-wide billing/invoice reconciliation and external-training job lifecycle.
5. Independently reviewed datasets, held-out evaluations and drift evidence.
6. Real provider configuration, delivery, deployed workers and end-to-end acceptance.

New active phase: audit and implement discoverable personal phone collection,
dashboard reminders until supplied, independent profile saving without a Meta
connection, and explicit OTP verification through the existing scoped workflow.
A saved profile number must never imply verified WhatsApp identity or alert consent.
