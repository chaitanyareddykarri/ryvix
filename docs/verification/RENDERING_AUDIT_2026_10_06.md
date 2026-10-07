# Rendering and provider-free pending-work audit

> Historical checkpoint: later implementation and applied-migration status are
> recorded in [current status](../PROJECT_STATUS.md), [pending work](../PENDING_WORK.md)
> and the [October 7 rollout](MIGRATIONS_2026_10_07.md). Original findings and test
> results below describe this report's checkpoint, not the current pending queue.

Read-only product audit on October 6. No application fixes, provider requests,
commits or pushes. Temporary audit scripts, JSON results and screenshots are in
`tmp/render-audit/`.

## Actual checks

- Fresh full offline run: 86 application suites and 23 Node tests passed; 12 AI
  runtime files restored byte-for-byte.
- Fresh existing browser suite: 18 passed.
- Broader audit: all 23 page components at 320, 375, 390, 768 and 1280 CSS pixels
  (115 route/viewport combinations). No uncaught render or unexpected-request
  failures in the corrected initial-state fixtures.
- Twenty additional populated/state checks for tasks, Gmail replies, observability,
  dashboard and servers, plus four explicit server-enrollment modal checks.
- Actual components and global/module CSS were rendered in Chromium. Mobile cases
  used touch/mobile emulation. API responses, auth and framework boundaries were
  explicit fixtures; the landing page used a signed-out server-component fixture.
- Browser screenshots inspected for login, chat, dashboard, tasks, observability
  and server enrollment. External fonts were excluded; system fallback fonts used.

This is not physical Android/iPhone, Safari/WebKit, Next hydration, real session,
virtual keyboard or comprehensive action acceptance. Initial-state rendering does
not validate every populated, error, permission or interactive state.

## Confirmed issues, highest priority first

1. **Task results misrepresent evidence.** `web/app/tasks/page.tsx:269` always
   displays a running isolated sandbox; line 275 always reports tests passed.
   A completed task without any PR record displays "GitHub PR Opened" at line 302.
   Reproduced with a completed task fixture containing no verification or PR.
   Wire these labels and approval availability to persisted artifacts and PR data.
2. **Dashboard false readiness/progress.** No selected project and disconnected
   GitHub still show LIVE, AI Ready, GitHub Synced and completed pipeline stages.
   `web/app/dashboard/page.tsx:2090` defaults the stage to 4 even with no task.
   Use measured states and honest unavailable/not-started labels.
3. **Chat navigation overflow.** The document is 1614 pixels wide at each tested
   viewport, including a 375px phone and 1280px desktop. Header navigation and
   controls extend offscreen. Add responsive navigation and workspace layout.
4. **Landing navigation clipped on phones.** Sign In/Get Started and Console
   extend beyond 320/375/390px; the ancestor hides horizontal overflow. At 375px,
   the Get Started link ends around x=587. The 320px hero also exceeds its content
   width. Hidden overflow must not conceal primary actions.
5. **Dashboard controls clipped.** At 375px, Telemetry ends around x=533 and Exit
   around x=669 while page width stays 375. At 320px Add deployed URL also clips.
   Fix the header and crowded pipeline labels; preserve the existing bottom nav.
6. **Populated task layout exceeds narrow phones.** Active task grid uses a 360px
   minimum column. Measured page widths: 384px at a 320px viewport and 385px at
   375px. Empty task state alone does not reproduce this.
7. **Gmail replies overflow with content.** A realistic long sender and long URL
   produce a 679px document on 320/375/390px phones. Constrain select/form widths
   and wrap reply text/URLs. Empty reply lists currently hide this defect.
8. **Observability columns are clipped.** Fixed-width log columns extend past the
   phone viewport under an overflow-hidden parent. Source/event details are not
   readable. At 320px, the document also reaches 352px. Use a deliberate scroll
   container or mobile row layout that retains all data.
9. **Browser test harness needs repair and expansion.** Its font-import stripping
   regex stops at a semicolon inside the Google font URL, corrupting CSS. Its alias
   resolver assumes `.tsx`, preventing login's `.ts` utility import. These were
   corrected only in the temporary audit harness, not silently counted as app bugs.
   The permanent suite lacks the above populated/responsive assertions.

## Other provider-independent pending work

- Review small touch targets, focus order, labels, contrast, all modals and keyboard
  behavior. Several default form controls measure below 24px; that is a review
  flag, not a complete accessibility-conformance verdict.
- Add actual Next.js route/hydration/navigation tests and comprehensive empty,
  loading, denied, failure, expired-approval, retry and cancellation states.
  Verify on physical iOS/Android and with an onscreen keyboard; `100vh` chat needs
  explicit keyboard/viewport acceptance.
- Resolve the known development dependency chain advisory compatibly. The previous
  same-day audit recorded five high findings; it was not rerun in this rendering
  audit. Do not confuse this with five independent application vulnerabilities.
- Extend bounded repository analysis: inherited configs, additional language
  parsers and compiler/dependency coverage. Current code is not a whole-repository
  compiler graph.
- Add representative independently reviewed retrieval/model evaluations and drift
  evidence. Existing test fixtures do not establish model accuracy.
- Finish account-wide usage/invoice reconciliation and the external-training job,
  evaluation and promotion/rollback lifecycle beyond the existing export UI.
  These are implementation gaps; credentials/provider setup are excluded here.
- Keep current status documentation and regression coverage synchronized with these
  findings. Earlier passing checks did not cover these visible states.

## What passed within scope

Login and password-reset initial layouts, servers and enrollment modal, usage,
deployment mapping, recovery/operation initial forms, notification/knowledge/learning/
experience/channel initial states rendered without uncaught errors in these fixtures.
The existing browser suite also passed denial-state checks, exact release-head
submission, self/expired restart approval restrictions, Gmail rejection behavior
and usage loading/unknown-count/keyboard tests. These are limited tested behaviors,
not a claim that every button or complete workflow works.
