# WhatsApp phone identity and SMTP checkpoint

Implemented phase 1 phone linking and corrected SMTP transport selection.
Migration `20261003000003` was applied with verified TLS after a dry-run selecting
only that migration. No resets, seeds, real OTP requests or notification sends.

Verification:

- 78 project suites and 15 Node checks passed.
- Typecheck, lint and production build passed. Secret scan: zero findings.
- Real PostgreSQL rollback fixtures passed RLS, tenant denial, cooldown, five
  persisted attempts, resend invalidation, single use, phone collision, inbox
  attribution, revoked membership, unlink, unknown delivery, expiry and send limits.
- 117 database boundary checks passed with no failures after the migration.
- Existing channel/learning real SQL regression checks passed, including inbox
  deduplication, reviewed task creation, tenant isolation and checkpoint gates.
- Provider payloads and SMTP rejection/fallback boundaries use injected transports.
  They are not evidence of real Meta or Gmail delivery.

The ordinary local environment has no SMTP user/password/sender configuration.
The SMTP verification helper therefore sent nothing and did not attempt login.
Settings may exist in hosted Supabase or deployment secrets; that was not inspected.
No new runtime training data or concurrent Next.js configuration changes belong
to this source batch. See [implementation and remaining phases](../infrastructure/WHATSAPP_ASSISTANT.md).
