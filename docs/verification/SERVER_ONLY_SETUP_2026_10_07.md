# Server-only environment setup — October 7, 2026

> Historical checkpoint: later implementation and applied-migration status are
> recorded in [current status](../PROJECT_STATUS.md), [pending work](../PENDING_WORK.md)
> and the [October 7 rollout](MIGRATIONS_2026_10_07.md). Original findings and test
> results below describe this report's checkpoint, not the current pending queue.

The continuation closes the implementation gap found in the fleet audit. A fresh
workspace can now create project/environment records from **Enroll New Server →
Create project environment**, without connecting GitHub first.

## Behavior

- Enter project and environment names and explicitly mark production when needed.
- Owner/admin/developer authorization is required. Viewer or revoked membership
  receives an error; no success is displayed after a denied save.
- The server API derives tenant/user from the authenticated session, limits the
  request body and validates names/classification. It rechecks membership under
  transaction locks before creating records.
- Deterministic namespaced slugs reuse the same infrastructure setup on retries.
  Existing environments never silently change production classification.
- Creation and organization audit commit together; audit failure rolls back the
  setup. Creation is limited to twenty environments per user/organization/hour.
- The new environment becomes selected in the enrollment modal. Generating an
  invitation remains a separate explicit action, and connection is only reported
  after fresh authenticated telemetry. Issued invitations keep their target locked.

Uses existing projects, environments and organization audit tables; no new database
migration or external provider is needed for this implementation. Project/environment
setup creates metadata, not a server, GitHub credential, cloud target or approval.

## Verification

- Offline wrapper: 97 application suites and 24 Node tests passed; twelve AI runtime
  files restored byte-for-byte.
- Typecheck and isolated production build passed. All seven final UI/fleet browser
  cases passed, including setup at 320px and 1280px; the eight existing phone
  onboarding cases also passed in the preceding run. Logs are recorded in
  `tmp/render-audit/server-setup-*`.
- Store and route fixtures cover tenant identity, denied roles, bounded input,
  retries, classification conflict, rate limit and audit rollback.
- Browser cases cover phone/desktop form behavior, denied save, successful selection
  and absence of automatic enrollment. An initial test exposed ambiguous select
  labeling; the environment selector now has an explicit accessible name.

Actual hosted SQL/transaction concurrency and agent installation remain deployment
acceptance tasks. No real provider, database mutation or server operation was run.
The previous team and repository-URL migrations remain separately unapplied.
