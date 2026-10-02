# ADR-023: Durable worker host ownership and preview domains

Job claims and workspace rows record a stable deployment-supplied worker host ID.
Process lease IDs remain separate. Cleanup, preview restoration and terminal
cleanup writes require the recorded host; unowned historical rows are not guessed.
Operators must reconcile historical sessions on their actual host before rollout.

Web and workers share an explicit host-to-preview-domain allowlist. Each host has
its own wildcard DNS/TLS route to its loopback gateway. Web signs a grant only for
the domain associated with the persisted host and never restores Docker sessions.
Host IDs must be unique per Docker daemon; do not share a Docker daemon across
different IDs or run multiple worker processes against its port allocator.

Missing ownership/configuration fails closed. This does not migrate a running
container between hosts or certify public proxy configuration.
