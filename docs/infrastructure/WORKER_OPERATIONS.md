# Worker operations and resource budgeting

## Corrected architecture

Keep web, coding, operations, Gmail, WhatsApp and experience workers in separate
processes. Their credentials, Docker permissions and failure behavior differ.
A Promise loop cannot isolate an out-of-memory failure, synchronous blocking or
`process.exit`. Workspace lock loss must stop that worker; merging it into a
messaging daemon would stop unrelated work too.

The common `scripts/worker-database.ts` creates a pool **per process**; it is not
a single pool shared with Next.js. TCP keep-alive and idle error listeners do not
retry SQL or implement advisory locks. Worker services own their locks and
authorization. Do not automatically rewrite database endpoints to port 6543.
Workspace and Gmail use session advisory locks and reject that transaction-mode
port. An arbitrary custom proxy's mode cannot be inferred from a URL, so verify
that custom endpoints preserve session affinity as well.

Use a direct or session-mode connection for those persistent workers; see
[Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).
Pool-size limits are configuration caps, not proof that the host or provider can
support the workload.

## Connection budget

| Process | Default maximum | Held connection consideration |
| --- | --- | --- |
| Web direct pool | 5 per process | Other clients/replicas count separately |
| Workspace | 5 | One lifetime host-lock connection |
| Operations | 3 | Transactional recovery and outbox work |
| Experience | 2 | Collection/indexing transactions |
| Gmail | 3 | Session lock plus polling queries |
| WhatsApp assistant | 3 | Transactional inbox/outbox work |

Set `RYVIX_WORKER_POOL_MAX=2` in a worker's own ignored environment file to reduce
its maximum. Only integers from 2 through that worker's default are allowed.
One connection would starve code that holds a lock while another query needs a
client. With one instance of each listed process, defaults total at most 21
connections for these pools; reducing all five worker caps to 2 gives 15.
These are arithmetic limits, not measured usage, and exclude other processes,
Supabase clients, verification tools and deployment overlap. Leave headroom.

Start only needed workers. Measure process RSS, container peak memory, queue
latency, pool waits and database connections under representative load before
selecting VM size or lowering caps. No fixed RAM reduction, zero-cost hosting,
zero connection failures or guaranteed uptime has been established.

## One control group, separate workers

Existing service units already provide restart-on-failure. Install only reviewed
units and configure their users, secrets and privileges using
[worker deployment](WORKER_DEPLOYMENT.md) and the feature-specific runbooks.
The optional `ryvix-workers.target` starts no application workers by default.
After installing it and the required service units under `/etc/systemd/system`,
an operator can select configured workers, for example:

```sh
sudo systemctl daemon-reload
sudo systemctl add-wants ryvix-workers.target ryvix-operations.service
sudo systemctl add-wants ryvix-workers.target ryvix-whatsapp-assistant.service
sudo systemctl enable --now ryvix-workers.target
sudo systemctl status ryvix-operations.service ryvix-whatsapp-assistant.service
```

Add the workspace worker only on its approved Docker host; Gmail/experience are
optional and need their own feature flags. `PartOf=ryvix-workers.target` lets an
operator stop/restart the group while retaining per-service process
isolation. Stop/restart also propagates to any already-running worker with this
`PartOf` setting, even if it was started independently of the target. Starting
the target starts only its explicitly configured wants. A target being active
does not prove every child is healthy; inspect
individual service state and logs. Do not run a duplicate PM2/Compose worker set
alongside these services.

The existing production Compose file deploys web with immutable image/revision
checks and rollback verification. It does not bundle a Docker-authorized worker
into web. TLS, DNS, provider credentials and actual host deployment remain
operator configuration. No host services were installed or started by this change.

## Verification commands

`npm run verify:all` runs secret scan, typecheck, lint, offline tests and browser
fixtures in sequence and reports every result. The offline wrapper restores AI
runtime files. It is a developer verification command, not a 15-second health
endpoint or production certification.

- `npm run verify:all -- --list`: inspect the plan without executing it.
- `npm run verify:all -- --database`: also run the read-only hosted schema/grant check.
- `npm run verify:all -- --runtime`: also check runtime configuration and hosted
  database readiness; missing production inputs intentionally cause failure.
- `npm run build`: separate production-build check; isolate Next output if a
  developer server is running, as described in the development guidance.

Mutating SQL fixture probes, migrations, user deletion, provider evaluations,
notification dispatch and deployment are intentionally excluded from this command.
