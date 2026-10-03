# Documentation synchronization — 2026-10-03

Reviewed the 142 tracked Markdown files for checkpoint drift. Updated current
indexes, integration contracts, agent context, deployment/schema guidance and
historical-report notices. Historical test results remain attached to their dates.

The current code reference is d81b281 and the recorded applied schema checkpoint
is 20261003000004. See [project status](../PROJECT_STATUS.md).

Changes documented:

- Gmail SMTP is the default for application OTP and account notifications;
  hosted Supabase Auth SMTP and read-only Gmail OAuth are separate configurations.
- WhatsApp OTP, opt-in assistant, durable replies/history/quotas, confirmed coding
  and task notifications are implemented. Release/server approval stays on the web.
- Experience collection, independent lesson review, explicit personal memory and
  bounded repository indexing do not establish universal self-learning or accuracy.
- Web/API and four separate worker processes have distinct runtime requirements.
- The latest schema additions and superseded email-transport decision are recorded.

This is a documentation-only update. No application tests, provider sends, database
migrations or browser acceptance were run during this update. The prior 79 suites,
15 Node checks and 125 database checks are recorded in the
[assistant checkpoint](WHATSAPP_ASSISTANT_2026_10_03.md), not newly measured here.
Local Markdown links, whitespace and the repository secret scan were checked.
Existing runtime data and the unrelated Next.js configuration change are excluded.

Still required: real Meta OTP/reply/template delivery, Gmail SMTP inbox receipt,
Gmail OAuth intake, configured Linux workers/images and public DNS/TLS, deployed
authenticated browser flows, an approved coding/release/recovery acceptance run,
and representative independently reviewed learning/evaluation data. Provider
accounts and rollout order are in the [provider plan](../infrastructure/PRODUCTION_PROVIDER_PLAN.md).
