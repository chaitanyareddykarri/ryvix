# ADR-017: Public endpoint probes must not fabricate host health

The historical monitoring route accepted anonymous arbitrary URLs, selected a
default tenant server/environment, fell back to localhost, invented heartbeat
timestamps, and ignored failed health-check writes. Remove those fallbacks.

Require a verified tenant operator and an explicit HTTP/HTTPS endpoint. Restrict
probes to standard ports and exclusively public IPv4 DNS answers. Pin the selected
address to prevent DNS rebinding, retain HTTPS certificate validation, never follow
redirects, bound DNS/request time and header size, and discard the response body.
The existing ExternalMonitoringService delegates to this same implementation.
IPv6-only/private/custom-port targets are deliberately unsupported by public probes.

Return endpoint measurements without persisting an arbitrary URL against a guessed
environment. A supplied server ID must be tenant-authorized. Correlate heartbeat
only if the exact endpoint is already registered as a health check in that server's
environment and the connector is active with a device public key. Missing/stale/
future heartbeat evidence returns unknown host health. An endpoint failure with
a fresh heartbeat is not proof of total server outage. No incident, notification
or recovery action is created by this diagnostic request.
