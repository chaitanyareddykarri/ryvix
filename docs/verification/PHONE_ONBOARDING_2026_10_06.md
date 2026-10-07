# WhatsApp contact onboarding

## Audit and implementation

The supplied audit was checked against the current repository. Profile phone
storage, scoped OTP challenges/links and assistant preferences already existed.
The dashboard did not expose contact entry or prompt for a missing number.
The old phone page required a business connection before it could do anything.

Implemented:
- `/api/profile/contact` reads/saves only the authenticated user's profile number,
  scoped to their verified organization through the existing RLS client. International
  number normalization, bounded input, safe errors and no-cache responses apply.
- A dashboard dialog prompts when the profile has no valid international number.
  Later/Escape dismisses for the current page visit. The reminder button remains;
  a subsequent dashboard visit prompts again until a number is saved. A lookup
  failure displays an error, rather than treating unavailable data as missing.
- A permanent Phone / WhatsApp link beside the profile controls opens management.
- A number can be saved without a Meta connector. Saving sends no message and
  creates no verified identity or notification consent.
- Shared OTP controls work in the dialog after saving and on `/profile/whatsapp`.
  Send/verify/unlink require explicit clicks. Changing the number or connector
  clears the pending code in the UI. Unknown delivery and expired codes remain
  visible. Existing backend cooldowns, rate limits, scope and single-use rules remain.
- Updating the profile contact does not silently replace a verified link. The page
  explains that the new number must be verified or the old link explicitly removed.
  Assistant and alert preferences remain separate.

No schema migration, provider configuration, real OTP or live database writes
were performed. Existing profile column/update grants and self-update RLS are used.

## Verification

- Offline: 87 application suites and 24 Node tests passed; 12 runtime files restored.
- Contact-route fixtures cover unauthenticated access, caller-ID spoofing, tenant
  scoping, invalid numbers/actions, oversized requests and safe database errors.
- 20 relevant browser cases passed: eight onboarding/workflow cases, ten dashboard
  and phone-page layout cases at 320/375/390/768/1280px, and two dashboard regressions.
- Typecheck and production build (including framework lint/type validation) passed.
  Secret regression scan: zero findings.

Browser/API fixtures prove local behavior only. Remaining acceptance: a real logged-in
user saves/reloads through deployed Supabase RLS; Meta template delivery/receipt;
physical phone/keyboard behavior; verified inbound attribution and explicitly enabled
assistant/alert delivery. The earlier suspended queue remains in
[the local checkpoint](LOCAL_CHECKPOINT_2026_10_06.md).
