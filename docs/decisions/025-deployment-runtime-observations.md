# ADR-025: Explicit deployment targets and measured reachability

An operator maps a verified repository's provider environment to a Ryvix
environment and public HTTPS health endpoint. No URL from a webhook is fetched.
Mapping changes, probe admission and completed observations are audited.

Manual probes require current operator membership, one request per target per
30 seconds, the latest received deployment status, and the existing pinned-DNS,
bounded, no-redirect public probe. Authorization and the mapping are rechecked
before persistence. Observations preserve endpoint, deployment event, check time,
HTTP status and latency. A newer event arriving during the probe makes the result
an observation of the selected historical event, not certification of the latest
release. A successful HTTP response is endpoint reachability, not proof that a
particular commit is executing or that the entire application is healthy.

The UI and diagnostic context present provider status and runtime observations
separately with this limitation. No deployment or recovery is triggered.
