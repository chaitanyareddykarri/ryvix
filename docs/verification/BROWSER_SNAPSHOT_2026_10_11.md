# Browser snapshots and chat preservation — October 11, 2026

Static task artifacts now render in the dashboard without public preview DNS,
a tunnel or signing secret. An authenticated endpoint checks operator membership,
task, project and organization before reading GitHub credentials. Saved edits
overlay the pinned base commit, including unchanged CSS/JavaScript dependencies.
PR approval remains unchanged; no database migration is needed.

The srcDoc iframe has an opaque origin, blocked network fetches/forms and no
parent-page access. Root index.html and up to 20 linked HTML/CSS/JS files are
supported, bounded to 300 KB per file and 1.5 MB total. This is a visual snapshot,
not a deployment. Nonembedded images, CSS imports, browser storage, navigation,
module imports and backend/framework behavior are not supported.

Local startup defaults to RYVIX_PREVIEW_MODE=browser. Docker Desktop and
npm run worker:local must remain running for new coding jobs. Public mode retains
DNS, HTTPS and signing requirements. Docker isolation, task checks, provider
credentials and the host lease remain required in both modes. Provider quotas
still apply. No queued customer task was replayed during verification.

Chat preserves received text when a stream fails and handles a final SSE line
without a newline. Server history remains the durable source; interrupted partial
answers persist only in the current page session. Observability has a separate
Vercel sample panel explicitly labelled simulated; it writes no real telemetry.

Verification includes source-overlay/limit tests and browser tests for CSS/JS,
reload, parent isolation, interrupted chat across tabs and demo labelling.
Local checks are distinct from deployment and real customer-task acceptance.
