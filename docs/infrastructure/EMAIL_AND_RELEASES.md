# Security email and approved website releases

## User flow

1. Ask Ryvix to design/change the website. Review its diff, checks and live preview
   on `/tasks`.
2. Approve creation of the GitHub PR. This approves publishing the proposed code;
   it does not by itself confirm a deployment.
3. An owner/admin visits `/releases`, reviews the exact commit and target mapping,
   then explicitly approves merge. The PR must have a clean merge state, match its
   stored head/base, target the repository's protected default branch and have
   reported successful checks. GitHub still enforces its own protection rules.
4. The existing customer CI/CD runs after merge. Every environment configured in
   that pipeline may run; the selected Ryvix target controls notification mapping,
   not the pipeline's deployment scope. Configure production to deploy only after
   approved merges, with any required GitHub environment approvals.
5. GitHub sends a signed `deployment_status` webhook. Email is eligible only when
   its repository, environment and deployed SHA match the approved release's merge
   SHA and unchanged target mapping. Pending statuses do not generate success mail.
6. The operations worker sends a success or failure notification to opted-in users'
   verified account email. Gmail recipients work without granting mailbox access.

The email says the provider reported deployment success. Endpoint reachability,
application correctness and proof of the executing commit are separate checks.
If the customer's CI/CD does not emit GitHub deployment statuses, add that reporting
to its pipeline or implement its provider-specific signed webhook before rollout.
Ryvix does not synthesize a deployment-success event from a merge or a preview.

## Email configuration

Use a Resend account with a verified sending domain. The notification adapter reads
`RYVIX_NOTIFICATION_RESEND_KEY`, falling back to an existing `RESEND_API_KEY`.
Set `RYVIX_NOTIFICATION_FROM` to a bare verified sender, e.g. `alerts@yourdomain.com`.
Set `RYVIX_PUBLIC_URL` to the deployed HTTPS application origin and
`RYVIX_EMAIL_NOTIFICATIONS_ENABLED=true` on the operations worker.

Visit `/notifications` while signed in to enable security and/or deployment emails
for each authorized environment. The destination is the confirmed account address;
request payloads cannot substitute an arbitrary recipient. Preferences apply to new
events. Current implementation sends each new persisted security event (all
severities except dismissed) and unresolved security-attack incident, plus terminal
deployment results for approved releases. It does not send attack evidence or raw
logs in the email.

The outbox deduplicates per user/environment/source event. Membership, confirmed
email, preferences and source scope are rechecked when sending. A recipient is
limited to three claims per minute. A durable `sending` state precedes provider
contact; a crash or timeout leaves `unknown`, without automatic resend. Resend
receives a stable idempotency key. `accepted` means provider acceptance, not proof
of Gmail inbox delivery. Review the history on `/notifications` and provider logs
for uncertain/bounced delivery. Supabase Auth OTP transport remains separate.

## Real security sources

The native agent has a `--report-security` mode. A trusted detector running on the
enrolled host can pipe a JSON event array to:

```sh
ryvix-agent --config /var/lib/ryvix-agent/device.json --report-security < events.json
```

Each event has `id` (stable UUID across retries), `type` (`auth_bruteforce`,
`http_attack`, `malware` or `suspicious_activity`), `severity` (`critical`, `high`,
`medium` or `low`), `observedAt` (fresh ISO timestamp) and `summary` (at most 1,000
characters). Send at most 20 events / 32 KiB, observed within two minutes. The agent
signs the server identity, body, endpoint, timestamp and random request nonce.

`/api/connector/security` verifies the enrolled device, rejects replay, deduplicates
stable event IDs and persists sanitized observations with audit records. A valid
signature identifies the reporting device; its classification is still a detector
claim to review. This reporting mode does not install a WAF or automatically parse
every customer's application logs. Wire the actual WAF/application detector to it
on the target server. Never give untrusted code access to the device key or config.

## Required live checks

Apply migration `20261002000003`, deploy matching web/worker and agent releases,
configure the notification provider, and log in with a verified recipient account.
Then verify a real measured security signal reaches the intended mailbox and a
design → preview → approved PR → approved merge → actual deployment → signed
webhook → email flow. Use an explicitly designated test repository/server. Do not
use production attacks or reboot a real host just to exercise the email queue.

Existing cloud recovery and WhatsApp live checks still need the deployment URL,
scoped cloud target credentials and configured Meta account/template/recipient.
The local environment inspection found those prerequisites absent; SQL/provider
fixtures are not substitutes for these checks.

## Provider references

- [Resend email API](https://resend.com/features/email-api)
- [Resend idempotency keys](https://resend.com/changelog/idempotency-keys)
- [GitHub PR and merge API](https://docs.github.com/en/rest/pulls/pulls)
- [GitHub branch protection API](https://docs.github.com/en/rest/branches)
