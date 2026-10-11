# Laptop workspace repair - October 11, 2026

Reviewed Antigravity changes through 4b81537 against the observed failed task.
The user selected the laptop as the workspace host; Vercel remains web/API and
Railway remains selected background services. No unlimited-provider promise.

## Confirmed findings

- Both configured provider model-list requests returned HTTP 200 and contained
  the selected model. Both answered small completion probes. A coding-plan
  fixture failed over from Gemini to Groq and returned a valid JSON change plan.
  A subsequent Gemini-only request reported rate limiting. This does not prove
  that the historical request had the same cause; its generic error lost detail.
- Database SELECT 1 passed; PostgreSQL idle_session_timeout was 0. The original
  host-lock connection loss remains unexplained. Fail-closed exit is retained.
- Both the configured preview base and a session hostname returned ENOTFOUND.
  Public previews cannot work until wildcard DNS, tunnel and TLS are configured.
- The reported public ecommerce repository is plain HTML/CSS/JS. It was detected
  as generic, with no preview command. Some files exceed restricted Micro limits.
- Launcher claimed model readiness based only on DATABASE_URL text presence.
- Telegram allowed typed phone linking, suffix-only identity matching, and
  unsigned requests when its webhook secret was absent.

## Changes

Safe provider failure reasons, Retry-After preservation and truncated/empty
response rejection; 64000-character default context budget restored. Complete
source files must fit the budget; partial file bodies are never editable context.
Larger supported budgets remain explicit configuration, not unlimited tokens.
Local ignored worker configuration uses the bounded budget too.

Preflight validates the exact child environment, provider configuration, approved
images and session-mode database URL. DNS is checked before startup; the worker
starts its gateway then verifies public HTTPS before claiming jobs when launched
locally. Missing external routing stops startup with no queued jobs consumed.
A periodic query checks the advisory-lock connection; loss still stops execution.
Raw prompts/provider errors are not logged or sent as Telegram failure messages.

Standard HTML sites get a trusted static checker/server in the Node image, with
512 files, 1 MiB per file and 8 MiB total limits. The Micro profile retains its
original limits. Generic echo commands no longer count as passing tests/builds.
Unsupported stacks require their own approved images rather than arbitrary fallback.

Mobile dashboard navigation now has named accessible buttons in one scrollable
row. Chat and preview stack on smaller screens, prompt chips and preview tools
wrap, and the check history has bounded height.

Telegram requires a configured webhook secret and private sender-matching chat;
linking requires the sender's own shared contact and one complete international
phone match. Typed numbers and last-ten-digit matching no longer establish identity.
Existing links made under the old rules still require account-owner review and
reverification; this change does not certify existing identities or provider flows.

## Verification and remaining activation

97 offline application suites passed and 12 AI data files were restored. Six new
regression tests passed. Typecheck, lint and secret scanning passed. 87 existing
browser tests passed; four new coding/preview layout tests passed at 320, 768,
1024 and 1440px after fixing the failures they exposed. A real local Docker
fixture served a page and a larger stylesheet; .gitignore was not exposed.
The local Node image was rebuilt. Live provider probes used synthetic input only;
no customer job was retried and no Telegram message was sent by these checks.

Before real previews: configure wildcard HTTPS for the exact worker map, preserve
Host through the tunnel, use a fresh private signing key matching Vercel, verify
an authenticated one-repository task and unauthorized/expired preview denial.
Cloudflare's default Universal SSL does not cover deeper nested session subdomains.
The signing value previously pasted into chat must be rotated before activation.
Do not expose the Docker daemon. Keep the laptop awake and the tunnel running.
Provider quotas/billing remain provider-controlled; no limit bypass is implemented.
Publishing code does not activate a laptop worker or configure external DNS/TLS.
