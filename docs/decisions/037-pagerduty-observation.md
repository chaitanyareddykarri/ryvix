# ADR 037: Read-only PagerDuty incident observation

Optional operations-worker reconciliation queries the fixed PagerDuty REST API by
notification deduplication key and explicitly configured service. Vault JSON may
contain `routingKey`, read-authorized `apiToken` and `serviceId`; plain routing keys
continue supporting send-only operation. One job is claimed per cycle, at most once
per 15 minutes for seven days. Current owner/admin scope is checked before the query
and before storing observations. No PagerDuty incident is modified.

Only an unambiguous matching incident key/service/id is recorded. Grouped incidents
without an exact incident-key match remain unobserved in this bounded implementation.
Provider state is stored separately from delivery status: acknowledged/resolved does
not establish message delivery, recovery or Ryvix incident resolution. Errors retain
the previous timestamped observation. Migration `20261005000003` adds bounded
observation metadata to the existing backend-only outbox.

Reference: [PagerDuty incident lookup](https://docs.pagerduty.com/developer/api/reference/rest/incidents/list-incidents).
