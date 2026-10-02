# Approved service operations

The `/operations` page requests a specific service restart and requires a
different current owner/admin to approve it within ten minutes. Approval,
dispatch and device result are durable and audited. Native telemetry remains
observation-only. Cloud resets and arbitrary shell/process/firewall commands are
not enabled by this feature.

Configure `RYVIX_COMMAND_PRIVATE_KEY` on the control plane as base64-encoded
Ed25519 PKCS8 DER, plus `RYVIX_COMMAND_SERVICES` as exact comma-separated systemd
unit names. Keep the private key in the deployment secret store.

Independently provision the matching base64 SPKI public key in the Linux agent's
private `device.json` as `commandPublicKey`. Set `commandServices` to an array of
exact allowed units and `commandJournal` to an absolute path inside its private
writable state directory (for example `/var/lib/ryvix-agent/commands.json`).
The daemon must run as the unprivileged `ryvix-agent` account. Grant that account
only the operator-approved systemd authorization for those units, using the host's
policy management. The installer does not grant broad root or sudo permission.

The agent polls a separate signed endpoint, verifies the pinned control-plane
signature, target, expiry and local allowlist, and journals acceptance before
executing `/usr/bin/systemctl` with separate arguments and a 30-second deadline.
An exclusive process lock and one-use marker prevent concurrent/restarted agents
from reexecuting a command. Interrupted attempts stay unknown. Signed receipts
are retried independently. A successful receipt requires a separate `is-active`
probe; that proves service state, not application health or a deployed commit.

Retain the journal and markers when restarting/upgrading the daemon. Investigate
unknown outcomes before issuing another request. Commands have a two-minute
execution window; three deliveries per service per 15 minutes and 60/300-second
cooldowns bound repeated restarts. Existing telemetry-only agents keep working
without command configuration and cannot execute commands through acknowledgements.

Local verification includes Go signature/target tests and Linux-container journal,
replay and crash tests with an injected command runner. Live SQL approval,
revocation, replay, receipt and cooldown fixtures were rolled back. No real
service was restarted; rollout still requires an authorized Linux test host.
