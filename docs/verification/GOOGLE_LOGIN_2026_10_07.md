# Google login implementation — October 7, 2026

> Historical checkpoint: later implementation and applied-migration status are
> recorded in [current status](../PROJECT_STATUS.md), [pending work](../PENDING_WORK.md)
> and the [October 7 rollout](MIGRATIONS_2026_10_07.md). Original findings and test
> results below describe this report's checkpoint, not the current pending queue.

Implemented Google OAuth alongside existing manual email/password authentication.
Both login/signup tabs use the same Continue with Google action, requesting account
selection without offline Google API access or Gmail scopes. Provider errors are
displayed safely and duplicate submissions are disabled during navigation.

The new `/auth/callback` exchanges the PKCE code via Supabase SSR, verifies the
user and their profile/current membership under RLS, then redirects to the fixed
dashboard path. Production redirects use configured `RYVIX_PUBLIC_URL`, not an
untrusted host header or `next` parameter. Callback/error responses are not cached.
The error page handles cancellation/session errors and offers a read-only workspace
retry or local sign-out. It does not automatically assign privileged membership.

Middleware now allows callback/error pages and carries refreshed cookies into
redirect responses. Existing manual signup, OTP and recovery handlers are retained.
The existing new-user trigger provisions Google users; its hosted execution and
same-email identity linking still need real acceptance after provider activation.

## Verification

- `npm run typecheck`: passed.
- Final `npm run test:offline`: 95 application suites and 24 Node tests passed.
  The earlier parallel run had 94 passes and one existing timing assertion failure
  (79ms versus a 50ms threshold in the cognitive orchestrator test). A rerun passed
  without changing that assertion. Both runs restored all 12 AI runtime files.
- Google browser suite: six passed, including login/signup at 320/375/1280px,
  explicit chooser parameters, provider failure, duplicate submission prevention,
  manual password login and safe workspace error UI.
- Secret regression scan: zero findings. Whitespace check passed.
- The first default-output build compiled but failed collecting `/_document` while
  a development server shared `.next`. The final `npm run build` with
  `RYVIX_NEXT_DIST_DIR=.next-validation` passed, including lint/type validation,
  page generation and all workspace builds.

Added optional `RYVIX_NEXT_DIST_DIR` to preserve the running development server
during validation. The isolated `.next-validation` output is ignored, and the
temporary Next-generated tsconfig include is restored after the build. Existing
development origins and runtime data are preserved.

## Pending external setup

[Exact Google Cloud and Supabase steps](../integrations/GOOGLE_LOGIN.md).
Enable/configure the Google provider, register the two redirect stages, set the
production application origin and deploy. Then test real account selection,
new/returning users, identity linking, hosted provisioning, cookie persistence,
manual recovery and physical phones. No new Google-specific database migration
is required. Prior team and URL migrations remain separately pending.

No credentials were requested or printed, no provider configuration was changed,
and no real Google flow was claimed as tested. No commit or push was performed.
