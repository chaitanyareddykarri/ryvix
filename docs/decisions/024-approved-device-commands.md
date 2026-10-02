# ADR-024: Separate approved device command channel

Commands never travel inside telemetry acknowledgements. An operator requests a
specific service restart for a server; another current owner/admin approves the
immutable command through approval_requests. Decisions and dispatch are audited
transactionally and expire. Both memberships are checked again at delivery.

The initial capability is restart_service for an exact systemd unit configured in
both the backend and device allowlists. No shell, firewall, arbitrary process kill
or cloud reset is enabled by this protocol. External cloud recovery stays separate.
Each command is signed with an Ed25519 control-plane key, bound to server and
approval IDs, and valid for two minutes. Devices pin the public key locally.

Device polls/results use the existing device identity with method/path-bound
signatures and durable nonce receipts. Command redelivery returns the same signed
envelope. The agent journals acceptance before execution and retries the result;
a crash after acceptance produces an unknown outcome, never automatic reexecution.
Signed results report measured systemctl verification, not general application
health. Three dispatched restarts per service in 15 minutes and progressive
cooldowns prevent loops. Unknown results require human investigation.

No command executes without explicit in-product approval, configured signing key,
locally pinned device key, exact service allowlists and OS-level permission.
