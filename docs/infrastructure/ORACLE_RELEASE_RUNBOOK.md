# Oracle pilot release runbook

Implementation companion to [the rollout plan](ORACLE_PILOT_DEPLOYMENT.md).
Do not enable deployment until host configuration and the native ARM CI job pass.

## October 9 execution order

Deployment is deferred. Use this order for the next restricted pilot; local
verification is recorded in [the current report](../verification/NONDEPLOYMENT_2026_10_09.md).

1. Review the local change set and select a release revision. Nothing from this
   remediation batch has been committed, pushed or deployed. Finish isolated
   concurrent invitation, environment and repository-URL acceptance before
   enabling those mutations for pilot users.
2. Obtain the planned Ubuntu ARM64 A1 host (2 OCPU, 12 GB). The previous Oracle
   attempt failed with capacity unavailable; no working instance is established
   by these checks. Confirm current account eligibility and pricing in the
   console. Use a public subnet/public IPv4 for the selected public HTTPS design,
   with an internet-gateway route, restricted SSH source IP and only HTTP/HTTPS
   public ingress. Keep application and Docker control ports private.
3. Prepare Docker, protected configuration, disk budgets and off-host backups.
   Build release images in CI, not on the VM. Keep deployment disabled until
   native ARM checks pass; record immutable images for all selected roles.
4. Back up and verify the hosted database. Apply the reviewed additive migrations
   `20261009000001_host_logs.sql` and `20261009000002_repository_quota_retry.sql`
   through the normal migration process before starting this revision. They were
   tested inside a rolled-back transaction, not installed persistently. Run
   `npm run verify:database` and require a clean migration ledger.
5. Configure app/preview DNS and TLS, Supabase redirects/SMTP, and the explicitly
   selected model credentials in protected role-specific files. Activate only
   the workers and integrations whose real credentials and acceptance are ready.
   Begin with web and essential workers, one coding session and bounded previews.
6. Release the same revision for web and selected workers. Check HTTPS health,
   authenticated chat, tenant denial, one disposable repository workflow,
   preview grants, agent enrollment, metrics, inventory and opt-in journal logs.
   Verify worker restart, quota retry and matching revisions on the real host.
7. Exercise backup restoration and application rollback, record resource usage
   and acceptance evidence, then decide whether to admit pilot users. Defer public
   launch if any required gate fails. Advanced training, broad scanner coverage
   and invoice certification remain separate unfinished capabilities and must
   not be advertised as complete.

## Images and acceptance

CD builds ARM64 on `ubuntu-24.04-arm` and publishes immutable revision tags for
the application, `-workers`, `-workspace-node` and `-workspace-egress` images in
the same GHCR namespace. The native ARM job builds these on Testing_branch and
main, checks image architecture, executes Node/Sharp, verifies writable data and
runs the actual workspace/egress/preview test. Native runner availability is an
account prerequisite; emulated local tests are labeled separately.

Record digests, not only tags. Configure the workspace and egress digests in
the workspace environment and image allowlist; pre-pull them on the host.
The Node workspace image can also serve as the reviewed ARM64 preview relay
image through `RYVIX_PREVIEW_RELAY_IMAGE`. Registry pull permissions must allow
the deployment host to retrieve all four images. No arbitrary customer image is
approved by this procedure. Customer native dependencies also need ARM support.

## Host setup and worker selection

Install supported Docker/Compose and Node 22 on the ARM64 host. Install Caddy as
a separate host service. Configure the existing `ryvix-production` runner only
for reviewed release jobs; never run untrusted PR jobs on the production host.
Select either existing systemd worker units or the Compose workers below.
Disable the other worker installation before starting this one.

Set GitHub deployment variables:

| Variable | Meaning |
| --- | --- |
| RYVIX_DEPLOY_ENABLED | Enable only after acceptance and production environment review |
| RYVIX_RUNTIME_ENV_FILE | Absolute protected web environment file |
| RYVIX_HEALTH_URL | Final HTTPS `/api/health` URL |
| RYVIX_HTTP_PORT | 3000 for the supplied Caddy configuration |
| RYVIX_DEPLOY_WORKERS | Comma-separated selected roles: workspace,operations,gmail,whatsapp,experience |
| RYVIX_WORKER_ENV_DIR | Absolute protected directory containing selected `<role>.env` files |
| RYVIX_DOCKER_GID | Numeric host Docker socket group ID |

Every active Compose worker must be included in the selected release. Changing
the selection is an explicit operator operation: stop any removed role first.
The script refuses selected running workers whose revision differs from web.
Do not leave an independently managed older worker running across a release.

Copy applicable values from `.env.example` and `pilot-worker.env.example` into
protected per-role files. Compose must read those files; the process environment
supplies secrets without baking them into an image. Existing protected files
are never overwritten by deployment. Do not log `docker compose config` output
with real secrets. Its `--quiet` validation is suitable for checking parsing.

Only workspace gets the Docker socket/group and host network. Other workers
have no Docker socket. The gateway remains bound to loopback; host firewall
exposes HTTPS only (plus restricted administrative access). Worker containers
run UID 1000, drop capabilities and have 768 MB controller memory limits; web
has 2 GB. These are initial caps, not proven capacity. Sandbox memory is separate.

Start with only essential roles. The workspace entry point requires an explicit
host budget and an explicit provider/model/credential. Use one session, a 4608 MB
sandbox budget and two CPU-equivalents initially. Admission reserves one CPU and
256 MB for the two possible sidecars in addition to each sandbox. Inventory is
conservative, including stopped/orphan containers until safely cleaned up.
One retained preview can intentionally block the next job until expiry. Monitor
queue age and expiry rather than bypassing the budget. Never run two host IDs
against the same Docker daemon: the allocation lock is per worker host identity.

## Explicit model configuration

Optional approved fallback now supports an ordered provider list. See
[AI fallback configuration](../integrations/AI_PROVIDER_FALLBACK.md) for the
Gemini/Groq settings, validation and limits. With an order configured, selection
below identifies the primary; without an order it remains single-provider.

Set the same `RYVIX_MODEL_PROVIDER` and corresponding explicit `GEMINI_MODEL`,
`GROQ_MODEL`, `OPENAI_MODEL` or `CLAUDE_MODEL` in web and applicable workers.
Install only the needed credential. Selection applies to chat and coding;
exhaustion fails visibly rather than trying a differently billed provider.
Unset conflicting `RYVIX_CHAT_PROVIDER`, or keep it identical. Select an actual
available model from the provider account; fixture model names are not deployable.
The operator's provider/model choice and authenticated live acceptance are still
required. No model key or account was configured by these code changes.

## HTTPS and preview certificates

Install `infrastructure/Caddyfile` with host service environment:
`RYVIX_APP_HOST`, `ACME_EMAIL`, `PREVIEW_BASE_DOMAIN`,
`PREVIEW_TLS_CERT_FILE`, `PREVIEW_TLS_KEY_FILE`. These are hostnames/absolute paths,
not URL paths. Caddy obtains the application's ordinary certificate automatically.
Use your DNS provider's supported DNS-01 ACME client to obtain a wildcard preview
certificate. Grant Caddy read access to its key without making it world-readable.
Configure automated renewal with a deploy hook that validates then reloads Caddy;
test renewal before launch. Do not assume stock Caddy includes a DNS provider
plugin. The supplied configuration uses certificate files and needs no plugin.

Point app and wildcard preview DNS at the host. Match the preview base domain to
`RYVIX_WORKER_PREVIEW_DOMAINS` and the worker's stable ID. Use a separate preview
registrable domain where possible, and never broaden authentication cookies to
untrusted preview hosts. The proxy preserves Host and query parameters for grant
verification and flushes streams immediately. Do not add preview access logs
containing signed grant URLs. Test both normal HTTP and WebSocket preview traffic,
invalid/expired grants, API streaming and certificate renewal on the real origin.

## Persistence, backup and restoration

Developer ai/data is excluded from all image builds. Each process role uses its
own named volume, initialized from a UID-1000-owned directory. Web uses
`ryvix_ai-data`; workers use `ryvix_workspace-ai`, etc. They do not share mutable
JSON files; cross-role shared state must use existing database records. If moving
existing state, explicitly inventory and review the source; never overwrite a
volume with an unreviewed developer checkpoint.

Stop the volume's writers before backing up. The helper refuses running mounts:

```sh
node scripts/backup-ai-volume.mjs ryvix_workspace-ai /secure/backups REVIEWED_WORKER_IMAGE
```

The helper reads the volume without network access and creates a private archive.
Copy it to encrypted off-host storage with retention appropriate to the data.
For restoration, create a new empty named volume, extract a trusted archive with
an isolated helper, verify ownership and expected files, then test a disposable
worker against it. Only after validation should the operator switch the service
volume. Never extract an untrusted archive or overwrite the active volume.
Separately back up Supabase using its supported database procedure and test a
restore in an isolated authorized project. Do not restore test data over production.

## Release and rollback

`scripts/deploy.mjs` pulls selected images before stopping services, checks
existing web/worker revision consistency, then starts web and selected workers
at the same revision. It verifies web health/revision; Compose confirms worker
process startup, not end-to-end provider health. Check logs, queue processing and
host locks after startup. Stop grace is 16 minutes; deployment timeout allows it.

On a failed release, selected workers are stopped, previous web and previously
running selected workers are restored, and previous web health is verified.
Newly introduced worker roles stay stopped after rollback. If restoration fails,
the command reports operator intervention rather than claiming success.

For an intentional rollback, set `RYVIX_IMAGE` and `RYVIX_RELEASE_SHA` to the
recorded previous image/revision, keep the matching protected configuration and
run the same deployment command after operator approval. Do not roll back
database schema destructively. Stop admissions/drain jobs before an operational
rollback and assess any provider requests with unknown outcomes before retrying.

Run the [pilot acceptance checklist](ORACLE_PILOT_DEPLOYMENT.md) on the actual
host before public launch. No live messages, provider calls or host deployments
are performed merely by running local unit tests.
