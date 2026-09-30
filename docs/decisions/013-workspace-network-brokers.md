# ADR-013: Trusted network brokers for isolated workspaces

Live Docker verification found that ports requested on an internal-only bridge
were not published. Customer containers remain on their private internal network.
A separate trusted, resource-limited TCP relay publishes only the loopback preview
port and forwards to that one sandbox's port 3000. No customer code executes in
the relay. It expires with the workspace and is removed during teardown.

A network label cannot prove egress enforcement. Dependency downloads and Git
checkout instead use a short-lived trusted HTTPS CONNECT broker. It accepts only
exact approved registry/GitHub hosts on 443, resolves IPv4, rejects private/reserved
addresses, and pins the validated address to prevent DNS rebinding. Requests have
connection, inactivity, header and byte limits. TLS terminates at the destination,
not the broker. Credentials never enter the broker configuration or logs.

Customer commands use HTTPS_PROXY inside the isolated container. Direct outbound
traffic stays blocked. Broker removal is required after the download phase; a
cleanup failure terminates the workspace. Operator-approved broker images must be
built from the checked-in recipe and configured before repository execution.
The old RYVIX_WORKSPACE_EGRESS_NETWORK label-only path is retired.
