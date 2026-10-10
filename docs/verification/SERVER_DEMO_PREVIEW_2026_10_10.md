# Server demo and preview refresh

User explicitly requested mock server data and previews that change after code
edits. Added /servers/demo, linked from /servers. The page labels all server,
repository, log and security scenarios as simulated. No database records, real
repository connections, telemetry or security results are created. It links to
the existing real GitHub and agent-enrollment flows for actual connections.

The demo editor refreshes a sandboxed srcDoc iframe after a 300 ms debounce.
The iframe has an opaque origin and CSP blocking network requests, forms and
external resources. Inline scripts/styles support small page demonstrations.
Content is limited to 20,000 characters and remains in browser component state.
It is not a framework builder or persistent repository editor.

Real dashboard preview frames remount when the selected task ID, status,
updated_at or commit changes. Added a manual Reload preview button without
rewriting signed preview URLs. This reloads worker-served content, not production
deployment. A working workspace worker and public authenticated preview endpoint
are still prerequisites for live coding previews.

Validation: typecheck passed; test:offline passed 97 application suites and
restored 12 AI runtime files; dashboard browser regressions passed (4 tests),
new demo/real-refresh browser tests passed (2 tests). Secret scan: zero findings.
No production deployment or real-provider acceptance is claimed.
