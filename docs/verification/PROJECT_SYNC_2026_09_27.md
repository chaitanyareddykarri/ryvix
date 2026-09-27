# Project synchronization — 2026-09-27

Integrated incoming `origin/main` commit `2707906` (dashboard redesign) with
the existing local repository onboarding, API, and UI changes on
`codex/project-sync-20260927`. The dashboard keeps the incoming project selector
and history layout, local task deletion, and workspace/deployment empty states.

Additional fixes authenticate task updates, scope updates and deletes to the
creator through the session database client, and rely on foreign-key cascades
instead of deleting another task's dependent rows before authorization.
Organization mutations require owner/admin membership and no longer accept an
unchecked organization ID from the request. Route regression tests exercise
unauthenticated access, missing ownership, and insufficient organization roles.

Validation:

- `npm run typecheck`: passed after merge.
- `npm run build`: passed; one dashboard effect-dependency lint warning remains.
- `npm test`: 40 passed, 1 failed (neural inference timing benchmark measured
  0.3439 ms against its 0.2 ms threshold).
- Isolated rerun of repository analyzer, route authorization, and neural
  classifier tests: passed; neural inference measured 0.0717 ms.
- Git whitespace and conflict-marker checks: passed.

These checks do not establish production readiness or verify live account
integrations. Existing documentation includes historical claims and counts.
An existing database credential was found in Git history and requires rotation
by the account owner; history was not rewritten.

The original local `ai/data` snapshot was restored after tests and is excluded
from these source commits. Ignored environment files were not staged.

GitHub and Supabase are the relevant optional Codex plugins for this stack.
Installation/account connection was offered but is not confirmed. Root
`AGENTS.md` records the project navigation and validation workflow for future
sessions; no external memory service is required for that file.
