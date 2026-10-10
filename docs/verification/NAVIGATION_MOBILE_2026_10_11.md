# Navigation hierarchy and mobile layout verification

This frontend update preserves the root introduction at `/` and keeps `/dashboard`
as the application Console. Return to Dashboard links target `/` and sit outside
the five-section primary navigation. Next.js `usePathname()` selects the active
section; operation and recovery routes belong to Server Approvals.

The new `/server-approvals` parent links to the existing `/operations` and
`/recovery` workflows. Both children show Back to Server Approvals. Servers tools
and demo show Back to Servers. API requests and approval rules are unchanged.

Scoped mobile styles constrain Servers, Tasks, the enrollment modal and
Observability content. Severity filters wrap. Only the Observability records
wrapper scrolls horizontally; its loading, empty and error messages remain within
the visible border. Approvals and notifications reuse existing workspace styles.

Before publication, upstream commits through `9f1220a` were pulled and the incoming
Telegram navigation label was preserved. Publication is limited to the testing
branch; no production merge or deployment is authorized by this update.

Validation:

- `npm run typecheck`, `npm run lint`, and `npm run build`: passed.
- `npm run test:offline` (runs `npm test`): 97 application suites and 45 Node
  tests passed; 12 AI runtime files restored byte-for-byte.
- Full browser run: 323 passed; five onboarding checks required updating after
  upstream replaced the WhatsApp popup with Telegram. The changed onboarding
  and fleet files then passed all 15 targeted checks. Existing WhatsApp OTP
  coverage now mounts the unchanged standalone verification component.
- All six phone widths: 320, 360, 375, 390, 414, 430px. Tablet and desktop checks
  also passed. Servers/Tasks desktop content screenshots and Observability
  desktop sizing/styles matched the pre-change implementation.
- Incoming Telegram fixture checks: passed separately (not registered in the
  main runner). No Telegram messages were sent.
- Secret regression scan: zero findings. `git diff --check`: passed.

Browser coverage uses actual rendered components with isolated API/authentication
fixtures, not live provider calls or physical-phone testing. Root anchors, active
sections, parent links, modal bounds, long content, table scrolling, and loading,
empty and error states are covered. These results do not certify deployed services.
