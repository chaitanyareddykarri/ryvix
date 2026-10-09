# Optional signed journal collection

Apply migration `20261009000001` before enabling the new log endpoint or running
the updated observability query. The log table has RLS and denies browser roles
direct access. Backend queries authorize the tenant through project membership.

Set `RYVIX_LOG_UNITS=ssh.service,nginx.service` in the enrolled agent's service
environment to enable collection. Use actual unit names, at most four. Give the
agent only the journal read access required by the host policy. This does not
grant restart permission. Unset the variable to disable forwarding.

Every telemetry iteration reads at most the last 50 journal records from the last
60 seconds per unit, under a three-second timeout and a 256 KiB output limit.
Journal cursors create stable event IDs for deduplication. Multiline, oversized,
stale and private-key records are omitted. Common credential patterns are redacted
before transmission and again on ingestion; redaction cannot recognize every
application-specific secret. Configure source logging accordingly. Failures are
reported without logging raw contents. This is a bounded recent-log sample, not
a lossless log archive: high-volume bursts and outages longer than the window
can lose records. Docker stdout/files are not directly collected; applications
must write to the configured journal units for this collector.

Backend accepts up to 50 fresh records / 128 KiB per signed request, under the
existing shared per-device rate budget. It rejects wrong/revoked identities,
replays, stale timestamps and duplicate IDs. Stored text appears as HOST entries
on Observability. Existing search/severity filters apply to the loaded records;
this does not implement full-history search or an arbitrary remote log reader.

Set `RYVIX_HOST_LOGS_ENABLED=true` in the operations worker for bounded seven-day
cleanup (up to 1,000 rows per iteration). The read query also excludes expired
records. Audit records retain ingestion counts, never raw messages.

Rule v1 flags at least five SSH authentication-failure entries in a newly received
batch as a possible brute-force attempt, and flags OOM-kill messages as resource
exhaustion observations. Detection is deterministic and batch-scoped. It does not
identify malware binaries, scan CVEs/ports, prove an attack or execute remediation.
Existing independently approved action and notification paths remain separate.
