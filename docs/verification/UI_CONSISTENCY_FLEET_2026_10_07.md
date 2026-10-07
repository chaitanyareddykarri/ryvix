# UI consistency and server fleet audit — October 7, 2026

## UI corrections

The session-added phone dialog and operational wrappers did not match the main
dashboard: different navy surfaces, unstyled dialog fields/buttons and inconsistent
spacing. They now use the dashboard/Connect Server palette: dark canvas, charcoal
panels, subtle borders, purple actions, cyan focus indicators and consistent controls.

- Phone dialog: styled field, primary save, secondary dismissal, separated footer,
  readable notices and responsive sizing. Native dialog focus/Escape remain intact.
- Phone profile: contact and optional verification cards side by side on desktop,
  stacked on phones. Contact saving, OTP and consent remain separate operations.
- Shared workspace: matching brand header, menus, typography, fields, buttons and
  panels across the pages added earlier in the session. Deployment cards match too.
- Screenshots inspected locally: `tmp/render-audit/phone-ui-mobile.png`,
  `phone-ui-desktop.png`, and `fleet-ui-mobile.png`.

## Navigation trace

The existing dashboard's Ryvix name links to `/`, the landing/home page. That is
different from the authenticated console at `/dashboard`. A signed-in home page
shows **Manage Server Fleet**, linked to `/servers`; a signed-out visitor sees
login actions. The server page's **Dashboard** link incorrectly pointed to `/`:
it now points to `/dashboard`. Brand links continue to mean home.

## Deep fleet findings and repairs

| Area | Finding / current behavior |
| --- | --- |
| Data source | `/api/servers` reads authenticated telemetry rollups and recorded service inventory, scoped through server/environment/project/current tenant membership. No synthetic metrics were introduced. |
| Freshness | Backend nulls unavailable/stale percentages. UI shows unknown status and unavailable values; recorded service status now includes observation time when present. Unknown status is visually neutral. |
| Stream recovery | Previously errors persisted after successful reconnection. Successful snapshots now clear them; interrupted/invalid streams stop displaying healthy-looking old cards and offer retry. |
| Fetch race | A delayed initial HTTP response could overwrite newer SSE state. Revision checks now discard superseded responses; unmount aborts pending requests. |
| Empty state | Added distinct no-enrolled-server and no-filter-match messages. An access/stream error is not presented as an empty workspace. |
| Filters | Added unknown and unreachable filters and selected-state accessibility. |
| Enrollment | Modal generates an existing single-use invitation, waits for authenticated fresh telemetry, and now refreshes the fleet after connection. Missing environment data has an explicit explanation. |
| Restart/reboot | Links preserve the selected server/service into `/operations` or `/recovery`. Store review confirms tenant/operator checks, distinct owner/admin approval, expiry and worker authorization checks. Opening a link never restarts or reboots a server. |
| Guidance | Removed wording implying enrollment alone enables automatic recovery. Capabilities, cloud targets, configuration and approvals are separate requirements. |

## Remaining server-only onboarding gap

**Superseded by the continuation:** [server-only setup is now implemented](SERVER_ONLY_SETUP_2026_10_07.md)
inside enrollment, with tenant/operator authorization and atomic audit. The findings
below describe what this audit found before that follow-up; live acceptance remains.

A brand-new workspace cannot enroll a server until it has a project environment.
Repository connection creates one; the current application has no dedicated
server-only project/environment creation screen. The enrollment modal now explains
this prerequisite instead of silently offering an empty selector. An authorized
project/environment creation workflow remains pending implementation, separate
from provider setup. Existing environments can use the implemented enrollment path.

Actual signed agent installation, configured operations/cloud recovery, alert
delivery and physical-phone acceptance still require the real-provider phase.
No servers, providers or hosted database records were changed in this audit.

## Verification

- Offline suite: 95 application suites and 24 Node tests passed. All 12 AI runtime
  files restored byte-for-byte.
- Full browser run: 181 passed, one timed out while creating a browser page before
  its test body. Follow-up: all 23 targeted cases passed, including that case and
  the added empty-environment/denied-access check. Earlier focused run had one
  signed-in home test using a signed-out fixture; corrected the test fixture.
- Desktop/mobile screenshot review completed. Shared pages were checked across
  the existing 320/375/390/768/1280px responsive suite; keyboard and OTP cases pass.
- Typecheck, isolated production build, secret scan and whitespace checks passed.
- These are provider-free fixture/browser checks, not live fleet certification.

Logs: ignored `tmp/render-audit/ui-fleet-*`. Existing local modifications were
preserved, including runtime data and Next development origins. No commit/push.
