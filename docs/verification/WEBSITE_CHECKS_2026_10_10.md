# Website checks and connectors

Added /websites, linked from Servers, using the existing authenticated/operator
public probe and tenant-scoped connections endpoints. Manual checks show HTTP
status, response latency (or elapsed failed attempt), URL and observation time.
Changing the URL clears old results and cancels an in-flight check. Redirect
responses are identified without following them. No background polling or
uptime history is claimed; probe observations are not persisted.

Connectors are shown only for an explicitly selected environment. The UI states
that a typed URL does not prove association and saved connector status does not
prove current provider reachability. CPU/RAM/private logs require server agent
enrollment. No fabricated metrics or automatic connection records are created.

Typecheck passed, 97 application suites passed via test:offline with 12 AI data
files restored, and both new browser tests passed after correcting the environment
selector label. Browser tests use fixture APIs, not live provider acceptance.
Changes are local and not published/deployed.
