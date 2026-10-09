# ADR 042: Oracle pilot release and workspace capacity

Date: 2026-10-08. Status: implemented for local validation; host acceptance pending.

Use native ARM CI for application/worker/workspace images and keep web plus
selected workers on one release revision. An optional Compose worker deployment
is an alternative to the existing systemd units, never a second simultaneous
worker installation. Only the workspace controller mounts the host Docker socket;
its host network permits the existing loopback preview gateway and relays.

Persist separate AI directories per process role, preventing unrelated processes
from concurrently replacing JSON state. This is not shared cross-process memory;
database-backed records remain the shared durable source. Never seed production
images with a developer's tracked ai/data. Backups require stopped writers and
off-host copies. Schema backup/restore remains a distinct operator procedure.

Before claiming a repository job, inspect Docker allocations, including retained
previews. A second check guards creation; allocation is serialized in-process.
One host-lock-owning worker per Docker daemon is required. Count resource limits,
reserve both sidecars and deny admission on unavailable/unbounded/orphan inventory.
CPU reservations are scheduling caps, not measurements or hardware isolation.

Pin one configured model provider and explicit model for streaming and coding;
do not silently fall through to another billed provider. Live model selection and
account availability still require operator configuration and an acceptance call.

Local Docker ARM emulation is useful evidence but cannot be labeled native ARM
validation. Native CI and final Oracle resource/network/TLS tests remain distinct.
