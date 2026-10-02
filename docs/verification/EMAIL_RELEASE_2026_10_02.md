# Security notifications and release checkpoint

Implemented persisted email preferences/outbox, Resend delivery to the confirmed
account address, `/notifications`, explicit owner/admin release approval at
`/releases`, bounded protected-branch GitHub merge dispatch and read-only outcome
reconciliation. The tasks page no longer describes an opened PR as a deployment.

Deployment emails require a terminal signed GitHub deployment event matching the
approved release's merge SHA, repository and unchanged environment mapping. They
report provider results, without claiming the running commit or application health.
Security emails use persisted non-dismissed security records and security incidents.
The signed `/api/connector/security` endpoint and native `--report-security` mode
let a trusted detector submit actual observations. This mode does not install a
WAF or infer attacks from ordinary CPU/HTTP failures.

## Verification

- `npm test`: 75 project suites passed, zero failed; 15 Node checks also passed.
- Production build, workspace typecheck and lint passed.
- `verify:release-email`: real PostgreSQL transactions exercised tenant denial,
  reviewed-head checks, blocked PR checks, one merge, verified recipient opt-in,
  signed security replay rejection, email deduplication, exact deployment SHA,
  mapping changes and opt-out. External providers were injected; fixtures rolled
  back. No real PR merge or email send occurred.
- Migration `20261002000003_release_email_notifications.sql` was previewed and
  applied through verified-TLS Supabase CLI. No reset or seeds.
- `verify:database`: 99 read-only checks passed, zero failures.
- Windows Go tests passed for the other packages, but application-control policy
  blocked the dispatcher test executable. All four dispatcher tests, including the
  security endpoint signature test, passed in the isolated Linux container.
  `go vet ./...` passed.
- Existing `ai/data` files were backed up before npm tests and restored. They remain
  intentionally outside source commits.

## Live prerequisites still missing

The inspected runtime has no configured public URL, cloud target/provider settings,
Meta app/verify token/Graph version/recipient configuration, Gmail OAuth application,
Resend key or notification sender. No deployed login session or designated live
test server/recipient was provided. These cannot be supplied by fake fixtures.

Configure the actual sender and user opt-in, deploy the operations worker and
matching agent, wire the real detector, and run controlled real notification and
release acceptance checks. Gmail recipients do not need Gmail OAuth for these
account notifications. Gmail mailbox intake is a separate feature.

See `../infrastructure/EMAIL_AND_RELEASES.md` for configuration and the complete
preview → user approval → CI/CD → verified provider result → email sequence.
