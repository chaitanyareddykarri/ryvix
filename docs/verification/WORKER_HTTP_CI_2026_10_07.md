# Worker, HTTP and CI follow-up - October 7, 2026

## Findings and changes

- All five background worker entry points lacked explicit TCP keep-alive.
  Operations alone also lacked the idle pool error listener; the other four
  already had listeners. A shared `createWorkerPool` now enables keep-alive with
  a ten-second initial delay, handles idle pool errors without logging secrets,
  preserves certificate verification and existing pool/statement limits.
- Keep-alive does not guarantee network availability. Queries still fail rather
  than replay ambiguous writes. Workspace advisory-lock loss deliberately stops
  execution so another process cannot compete for the same Docker host.
- Repository analysis had four unbounded fetch paths, including the contents
  fallback. One fifteen-second deadline now covers metadata, tree, fallback,
  manifests and body consumption. Caller cancellation propagates; timeout returns
  504, cancellation returns 408, and a timed-out manifest is not hidden as success.
- Both CI runs on `f05bd16` failed the same two Tasks page tests at 320px on
  Linux Chromium (352px document width). Grid minimum sizing and native form
  controls could exceed the available width. Explicit shrink limits, wrapping
  and constrained controls fix the layout; assertions remain unchanged.
- Browser failures now retain screenshots/traces and upload CI artifacts.
- The modal's fake count/deployment claims were already fixed in `f05bd16`.

## Verification and external boundaries

Local regression tests exercise pool idle errors, no mutation replay, TLS,
timeouts at each fetch stage, manifest body timeout and caller cancellation.
The focused Tasks browser tests passed at all five viewport sizes, including
empty and populated 320px cases. Offline application suites passed (97); runtime
files were restored. Linux CI must pass on the new testing revision before main
promotion; the earlier Windows result alone did not establish that.

Missing cloud model, preview DNS/signing, production images/host mapping, agent
release and Meta settings remain deployment inputs. No credentials or successful
provider responses were fabricated. WhatsApp delivery fails closed when not
configured; it does not silently switch production delivery to SMS or mock mode.
Five development-chain dependency findings remain separately tracked; production
dependency audit was clean at the prior pre-publish check.
