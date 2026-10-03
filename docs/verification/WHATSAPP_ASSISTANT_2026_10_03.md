# WhatsApp assistant checkpoint — 2026-10-03

Implemented opt-in durable assistant processing, separate conversation history,
hourly request quotas, structured external-model routing, authorized answers and
task/server summaries, expiring confirmed coding proposals, task/preview/PR/release
notifications, and authenticated approval handoffs. Added `/channels/assistant`,
API controls and a separate worker/service. Gmail SMTP remains the email transport.

Scope: one verified user/business connector, restricted to its project; owner,
admin or developer membership is required. The assistant cannot grant roles,
directly merge a PR, run a server command or approve its own recovery request.
Exact coding requests can be confirmed/rejected in WhatsApp. Release and server
approvals use existing authenticated pages and existing independent approval rules.

## Verification

- Full test suite: 79 project suites, zero failures, plus 15 Node checks.
- Final typecheck, lint and production build passed; secret scan: zero findings.
- Real SQL rollback checks cover protected tables, wrong tenant/user, opt-in,
  duplicate/stale inbound messages, private history, confirmation replay/expiry,
  task creation, notification deduplication, early delivery receipts, uncertain
  sends, service-window closure, disable during generation, quotas and unlink.
- Phone-link SQL regression checks passed with the new session invalidation.
- Migration `20261003000004` applied via verified TLS after a dry-run selected
  only that migration. No reset, seeds or migration repair.
- Post-migration database boundary checks: 125 passed, zero failures.
- All 12 original runtime files restored and hash-verified after tests. Runtime
  data and the separate local Next.js configuration edit are excluded from commits.
- Documentation link check: 69 local links resolved, zero broken links.

Provider calls are injected in tests. No real Meta reply, LLM answer, coding
provider change, preview, PR merge or customer deployment was performed by this
verification. The broad legacy synthetic suite output is not live certification.
Authenticated browser acceptance and production worker operation remain the final
provider/deployment stage requested by the user.

## Limits that remain explicit

The streaming model adapter does not expose billing usage, so token counts and
prices remain unavailable rather than fabricated. Request quotas and maximum
context/output bounds limit calls; inspect actual provider billing for costs.
Telemetry timestamps are shown, not converted into unsupported current-health
claims. Notifications poll recorded state and can skip short intermediate states.
Outside the service window, absent an approved update template, delivery is marked
`window_closed` and remains visible in the dashboard; it is not secretly retried.
Unknown sends are not automatically repeated. Unlink cannot recall a message
already authorized and in flight at the provider.

See [configuration and behavior](../infrastructure/WHATSAPP_ASSISTANT.md).
