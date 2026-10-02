# Ryvix native agent

The Go agent enrolls a server identity, sends signed telemetry and measured security
reports, and polls separately for approved service commands. Supported operational
execution is Linux systemd with explicit local allowlists; arbitrary shell,
firewall rules and container actions are not enabled by this command workflow.
No latency, binary-size or production recovery guarantee is implied.

## Enrollment and telemetry

```sh
ryvix-agent --version
ryvix-agent --once
# Obtain a short-lived enrollment token through the authorized server workflow.
# Provide that token on stdin; do not put it in shell history or commit it.
ryvix-agent --enroll --control-plane https://APP_HOST --config /var/lib/ryvix-agent/device.json
ryvix-agent --config /var/lib/ryvix-agent/device.json --interval 5s
```

Enrollment stores a private device identity. Protect the config and state directory
from other users/customer workloads. Requests use Ed25519 signatures bound to the
server, endpoint, timestamp, body and nonce; the backend rejects replay. Normal
telemetry acknowledgments cannot carry executable commands.

## Approved service restart

Provision the pinned control-plane public key, allowed systemd unit names and a
private durable command journal as described in
[approved service operations](../docs/infrastructure/APPROVED_SERVICE_OPERATIONS.md).
Run the daemon as the designated service account with narrowly scoped systemd
permissions. Independent approval, command expiry, signature checks, a journal,
process lock and one-use markers prevent unauthorized or repeated execution.
Signed receipts report a measured `is-active` result, not application health.
Cloud reboots run in the separate operations worker; the agent does not hold
cloud provider credentials.

## Security reports and user email

A trusted WAF/application detector can submit measured events using the enrolled
identity:

```sh
ryvix-agent --config /var/lib/ryvix-agent/device.json --report-security < events.json
```

Input is a JSON array, at most 20 events / 32 KiB. Each event has a stable UUID `id`,
`type` (`auth_bruteforce`, `http_attack`, `malware`, `suspicious_activity`), `severity`
(`critical`, `high`, `medium`, `low`), fresh ISO `observedAt` within two minutes,
and nonempty `summary` up to 1,000 characters. Stable event IDs deduplicate retries.

The signed `/api/connector/security` route persists sanitized observations. The
operations worker sends eligible security emails to opted-in confirmed account
addresses through Resend. This reporting mode does not install detection software
or automatically recognize every attack. See
[email/release setup](../docs/infrastructure/EMAIL_AND_RELEASES.md).

## Verification and release

Run `go test ./...` and `go vet ./...` from `agent/`. The latest checkpoint's Windows
application-control policy blocked the dispatcher executable; the four dispatcher
tests passed separately in isolated Linux. See the
[recorded evidence](../docs/verification/EMAIL_RELEASE_2026_10_02.md).

Publish versioned Linux amd64/arm64 artifacts with verified checksums and configure
`RYVIX_AGENT_RELEASE_MANIFEST` before production enrollment. Actual deployed
telemetry, security-source delivery and approved restart acceptance remain pending;
see [project status](../docs/PROJECT_STATUS.md).
