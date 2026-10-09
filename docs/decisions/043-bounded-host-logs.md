# ADR 043: Bounded signed host logs

Add a separate signed device endpoint for optional log forwarding. Require enrolled
identity, fresh observations, bounded bodies, replay protection and per-device rate
limits. Store redacted text in a browser-inaccessible RLS table. Tenant-authorized
backend queries expose it alongside existing operational records. Raw log contents
must never be placed in audit summaries. Keep seven days through bounded worker cleanup.

Initial deterministic rules identify SSH failure bursts within one batch and OOM
kill messages. These are investigation signals, not comprehensive malware scanning
or proof of compromise. No automatic operational action is authorized by a signal.
Collection is opt-in and restricted to operator-selected journal units. Migration
and deployed acceptance are separate from local implementation.
