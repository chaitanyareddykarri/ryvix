# Vercel, Railway workers and AWS workspace trial

Current selection, October 10, 2026. This supersedes the two-Oracle-host placement
for the active trial. Oracle instances are retained; no deletion is requested.

## Responsibilities

Vercel retains Next.js UI, existing APIs, GitHub OAuth/webhooks and web-chat AI
orchestration at https://ryvix.vercel.app. The user reports login works; that does
not verify every API/provider. Railway runs separate operations, Gmail, WhatsApp
and experience workers, enabled gradually. There is no separate generic AI HTTP
server to deploy. Model inference is external. Supabase stays hosted; do not create
a replacement database. AWS owns Docker workspaces and previews, not Railway.

AWS user output: i-08030c5418e523a14, 54.165.233.132, Ubuntu 26.04 AMD64,
908 MiB RAM, 8 GiB disk, no swap or Docker detected. These are user observations,
not a remote audit. Health checks, instance type, expanded storage and host setup
remain pending. Only the restricted static profile is considered at this size.

## Railway changes

The original published worker image defaults to workspace. Do not deploy that
default on Railway. `infrastructure/railway/Dockerfile` derives from the reviewed
53d9229 AMD64 worker digest and defaults to operations. Its entrypoint allows only
the four non-workspace roles, requires database configuration, prepares the AI
data directory ownership, and drops to UID/GID 1000 before starting application
code. It does not run migrations, copy developer data or start a Docker daemon.
The pinned parent intentionally means future source edits require a new reviewed
worker image/digest; rebuilding this wrapper alone does not update application code.

Separate `.env.example` files provide per-role variables. All optional operations
flags remain false until their migrations, authorization and providers are ready.
A process running with those flags false performs no useful operations work and
does not prove database connectivity. Measure real enabled cycles before acceptance.

## Setup for the first service

1. Create one Railway project with an empty service named ryvix-operations.
   Connect this repository only after these configuration changes are published.
   Choose repository root `/`, Dockerfile `infrastructure/railway/Dockerfile`.
   Do not use web as root, Railpack auto-detection or the root npm start command.
2. Leave Start Command empty for operations: the image supplies the entrypoint/CMD.
   For each later role, create a separate service using the same Dockerfile and
   set Start Command to `/usr/local/bin/ryvix-railway gmail` (or whatsapp/experience).
   Confirm effective process/logs on Railway; do not launch multiple roles in one service.
3. Add a separate volume mounted at `/app/ai/data` for each service. The wrapper
   handles new root-owned mount directories and then runs the worker non-root.
   Existing files must already belong to UID 1000; it does not recursively change
   restored data. Back up volumes and test ownership after restore. Never seed
   from developer ai/data. Supabase remains the durable application data source.
4. Add only that role's private variables from its example. DATABASE_URL must be
   verified-TLS direct/session pooling (especially Gmail's advisory locks), with
   a real PEM DATABASE_CA_CERT when needed. No localhost URLs or placeholders.
   Keep credentials sealed and production-only. Never paste them into chat.
5. Use one replica, disable Serverless sleeping and cron schedules, no public
   domain/port or HTTP healthcheck (these workers do not listen for HTTP).
   Set restart on failure, max 3; allow 60 seconds for graceful shutdown and
   zero intentional deployment overlap. Volume redeployments may have downtime.
6. Begin with a 512 MiB RAM limit and 256 MiB Node heap per enabled service where
   the plan allows; measure and adjust. Docker Compose limits do not transfer to
   Railway. Set actual service limits and spending alerts in the dashboard.
7. Verify backups, pending migrations 20261009000001/20261009000002 and ledger
   before activating work. No automatic pre-deploy migration command is provided.
8. Enable only the required workload flags after configuration, observe database
   outcomes and errors, then test restart/shutdown and resource consumption.

If the pinned GHCR parent is private, Railway must have appropriate build registry
access. A local authenticated build does not prove Railway can pull it. Do not
make the repository or package public merely to work around registry permissions.
Publishing this wrapper as a reviewed image in CI is an alternative if needed.

## Remaining gates

Local verification: Docker wrapper build passed; `node scripts/verify-railway-worker.mjs`
passed role/config rejection, root-owned fresh volume initialization, UID 1000
application execution, writes and graceful shutdown. The fixture uses no network
and disabled workload flags, so it proves neither database readiness nor provider
delivery. Typecheck passed; offline suite passed 97 application suites and 45 Node
tests, restoring 12 AI runtime files byte-for-byte. The Docker check is added to
AMD64 CI but that updated workflow has not run remotely yet.

This change prepares files locally, not a Railway deployment. Account plan, actual
Railway settings/volume behavior, registry access, secrets, migrations and enabled
worker acceptance remain external gates. No changes to Vercel URL settings or DNS
are required for the private workers. The purchased ryvix.co.in domain remains
unconfigured; AWS preview wildcard DNS/TLS is a later step.

Rollback: record the previous image and configuration, stop new work and drain
in-flight operations, restore a compatible image without deleting volumes, and
verify durable job outcomes before retrying any external action.

References: [start commands](https://docs.railway.com/deployments/start-command),
[volume ownership and lifecycle](https://docs.railway.com/volumes/reference),
[configuration](https://docs.railway.com/config-as-code/reference).
Current docs deprecate legacy config-as-code; this trial uses explicit dashboard
settings and a Dockerfile, not an unverified railway.json deployment contract.
