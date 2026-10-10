# Vercel and two Oracle Micro VMs: restricted trial

Updated 2026-10-10. This supersedes the single A1 hosting plan only for this
experiment. See [ADR 046](../decisions/046-micro-static-and-vercel.md) and
[verification](../verification/MICRO_STEP2_2026_10_10.md). These files do not deploy
anything by themselves. Both user-provisioned hosts have about 952 MiB RAM,
4 GiB swap and Docker; that does not establish application capacity.

## Progress through Step 2

This is the current deployment sequence. Earlier ARM/A1 plans remain historical
alternatives; they are not instructions for these two AMD64 Micro hosts.

| Step | Result and evidence |
| --- | --- |
| 1. Prepare both VMs | User-provided terminal output confirms Ubuntu updates/reboot, working Docker/Compose, active UFW and 4 GiB swap on each host. This is recorded evidence, not a fresh SSH audit. Current OCI rules, SSH exposure and persistence after another reboot still need rollout verification. |
| 2. Adapt deployment code | All five requested items implemented and locally checked: AMD64 image workflow, selected VM 1 workers, restricted VM 2 static workspace, Vercel/API persistence boundaries, protected templates and resource limits. See the detailed verification matrix. |

Step 2 recheck corrected the Compose tmpfs option parsing and added resolved
configuration checks to CI; the API audit also rejects fs/promises imports.
The batch remains local and uncommitted/unpublished at this checkpoint. No Ryvix
application deployment, real credentials or migration application is implied.

## Next steps, in order

3. **Release the code and images.** Review the complete diff, commit/publish the
   selected revision, require passing normal and AMD64 CI, enable the deliberate
   image publication setting and record immutable worker/static image digests.
4. **Prepare deployment configuration.** Set up the Vercel project with web as
   root; choose enabled worker roles, external model and provider credentials;
   prepare protected host env files, preview domain, TLS/renewal and registry
   access. Verify both hosts' actual firewall/SSH state and available resources.
5. **Prepare data and recovery.** Back up hosted data, apply and verify migrations
   20261009000001 and 20261009000002, and record compatible rollback versions and
   volume backup/restore procedures before starting the new application version.
6. **Deploy the restricted trial.** Install reviewed images/configuration on VM 1
   and VM 2, configure the preview HTTPS proxy, and deploy the matching Vercel
   revision. Enable only configured roles; start with operations and one static
   workspace session. Verify effective Vercel function durations and redirects.
7. **Accept the live deployment.** Test authentication/tenant isolation, streamed
   chat and disconnects, telemetry reconnects, enabled connectors, one authorized
   static repository task and signed preview. Measure both hosts' memory, swap,
   CPU, queues and restarts, and verify rollback/restore before expanding usage.

Full framework builds, simultaneous activation of all workers and production
capacity certification are outside this trial. Other product backlog items remain
in [pending work](../PENDING_WORK.md), separate from Steps 1 and 2.

## Host responsibilities

| Location | Responsibility |
| --- | --- |
| Vercel | Next.js dashboard, authorized APIs, OAuth/webhooks, chat streaming, telemetry ingestion and observation, preview grant signing |
| VM 1, 144.24.150.57 | Operations first; optionally ONE of Gmail, WhatsApp or experience/indexing after measurement |
| VM 2, 129.225.123.206 | Sole static workspace worker, Docker sandbox/relay, loopback preview gateway and host HTTPS proxy |
| Hosted Supabase | Auth, tenant data, durable queues, history, reviewed checkpoints and provider credential vault |
| Customer servers | Signed native monitoring agents; these do not move onto the Ryvix hosts |
| External model provider | Actual inference; web/WhatsApp/workspace each call the selected API where their orchestration runs |

The two VMs are in different VCNs. The design uses hosted queues and HTTPS, not
cross-VCN private addresses. Never expose Docker TCP or the loopback gateway.
Do not expect 150 GB storage or swap to increase physical RAM/CPU.

## CI images

`.github/workflows/micro-images.yml` builds workers and the static workspace on a
native AMD64 runner, runs checks plus actual Docker acceptance, and can publish
on a main push only with `RYVIX_MICRO_PUBLISH_ENABLED=true`. Publishing and host
deployment are separate. Keep the existing `RYVIX_DEPLOY_ENABLED` ARM deployment
disabled for this topology. Review ALL normal CI jobs before choosing a release.

Image names:

- `ghcr.io/<owner>/<repo>-micro-workers:<revision>`
- `ghcr.io/<owner>/<repo>-micro-static:<revision>`

Record RepoDigests from the job. Use digests for deployment; never use developer
images or mutable latest tags. The static image also supplies Node for the
trusted preview relay. Pre-pull images on VM 2. Builds run in CI, not on the VMs.

## Vercel configuration

Import the monorepo with root directory **web**, framework Next.js, **Node 22**,
and **Include source files outside of the Root Directory in the Build Step**.
`web/vercel.json` installs from the monorepo root and builds web. Enable Fluid
compute and verify the selected plan permits the configured 300-second maximum.
Chat aborts after 150 seconds (route allowance 180); telemetry streams reconnect
after 55 seconds (route allowance 60). There are no persistent worker loops here.
The JSON configuration also supplies a 300-second API-wide duration setting;
verify the effective deployed function settings rather than assuming the route
exports take precedence. The application abort/reconnect timers remain shorter.

Copy applicable settings from `infrastructure/micro/vercel.env.example` into
protected Vercel environment settings. `DATABASE_URL` must use verified TLS and
a hosted pooler suited to serverless traffic; the web pool defaults to 2 per
function process, not 2 across all instances. Bound project concurrency and
measure database connections. Workers requiring session locks must instead use
direct/session pooling, never transaction mode.

Web chat/history, personal memories, reviewed lessons and usage are database-backed.
Do not upload ai/data, weights, private keys or local environment files. Legacy
JSON memory experiments are not a production persistence mechanism and are not
silently redirected to ephemeral /tmp. The API graph audit rejects accidental
host-process/disk-store imports. Temporary process maps do not replace DB leases.

Register the actual app origin in Supabase Auth redirects, Google/GitHub OAuth,
webhook subscriptions and SMTP configuration. Vercel Hobby is for personal
non-commercial use; verify the appropriate plan before public/business use.

Official references checked for this adaptation:
[monorepo root access](https://vercel.com/docs/monorepos/monorepo-faq),
[function limits](https://vercel.com/docs/functions/limitations),
[Hobby usage](https://vercel.com/docs/plans/hobby).

## Protected host configuration

Store the reviewed repository checkout at `/opt/ryvix`. Create `/etc/ryvix` with
mode 0700, owned by the administrator. Copy only the needed `*.env.example` files
there, remove `.example`, fill values privately and set mode 0600. Never print
expanded Compose configuration with real credentials; use `config --quiet`.
Do not overwrite existing configuration or upload the developer .env wholesale.

The Compose `release.env` supplies the worker digest, `/etc/ryvix` path and (VM 2)
the numeric Docker group ID from `getent group docker`. Role files provide only
their required credentials. UID 1000 processes get separate named volumes
initialized from the image's owned `/app/ai/data`. No mutable volume is shared
between roles; do not seed them from developer checkpoints.

VM 1: `infrastructure/micro/compose.ai.yml` starts only operations by default.
Optional profiles are gmail, whatsapp and experience. Each process has a 192 MiB
RAM cap/256 MiB combined memory+swap cap and 112 MiB Node heap. Start at most one
optional role while monitoring. Enabling all roles is outside this small-host
trial. Flags default to false; enable each only when its provider and migrations
are configured. Learning/indexing is not a paid fine-tuning job.

VM 2: `infrastructure/micro/compose.workspace.yml` starts only the workspace
worker with 256 MiB RAM/384 MiB combined cap, 144 MiB heap, stable host ID,
static mode and one admitted session. Docker socket access is root-equivalent:
only this trusted worker gets it. No application-facing Docker endpoint exists.

After protected configuration is complete, validate and start the selected host:

```sh
# VM 1, from /opt/ryvix
sudo docker compose --env-file /etc/ryvix/release.env -f infrastructure/micro/compose.ai.yml config --quiet
sudo docker compose --env-file /etc/ryvix/release.env -f infrastructure/micro/compose.ai.yml pull operations
sudo docker compose --env-file /etc/ryvix/release.env -f infrastructure/micro/compose.ai.yml up -d operations

# VM 2, from /opt/ryvix; pull static/relay digest first
sudo docker compose --env-file /etc/ryvix/release.env -f infrastructure/micro/compose.workspace.yml config --quiet
sudo docker compose --env-file /etc/ryvix/release.env -f infrastructure/micro/compose.workspace.yml pull
sudo docker compose --env-file /etc/ryvix/release.env -f infrastructure/micro/compose.workspace.yml up -d
```

These commands are rollout instructions, not work already performed. Install only
one worker manager per role; do not also start old systemd workers.
Before release, run `node scripts/verify-micro-compose.mjs` locally or in CI.
It checks both rendered configurations with temporary dummy environment files,
including the single `/tmp` mount with its size and permission options.

## Preview and static repository contract

Use a separate preview domain, wildcard DNS to VM 2, and DNS-01 wildcard TLS.
The Caddy configuration at `infrastructure/micro/Caddyfile.preview` serves only
previews and forwards to 127.0.0.1:8081. Configure certificate renewal and key
permissions. Open only required HTTP/HTTPS at OCI and host layers; leave ports
3000, 8081, 3100-3999 and Docker private. Docker publication can bypass UFW:
relays must stay bound to 127.0.0.1. Do not enable preview access logs with grants.

The same preview signing secret and worker-domain mapping must exist on Vercel
and VM 2. Signed grants, host-only cookies, expiry and authorization remain active.

Supported input: root `index.html`, at most 64 regular UTF-8 text files, each at
most 32 KiB and at most 256 KiB total. Extensions: html, css, js, txt, md; LICENSE
also allowed. Hidden files, dependency manifests, image binaries, executable bits,
symlinks, submodules and build tooling are rejected. This deliberately narrow
mode is not compatible with a typical React/Vite/Next.js repository. Keep source
paths shallow (at most 12 directories). It performs bounds and JS syntax checks;
it does not claim browser correctness, test suites, or compilation.

No shell/build/install command from customer code or an AI answer is executed.
Only the trusted image's check and static server commands are accepted. Snapshot
fetching is backend-authorized with the GitHub token outside the sandbox. Existing
review/approval/PR boundaries are unchanged. An unsupported repository produces
a failed task, never a fake successful build. One retained preview blocks the
next task until expiration/cleanup. Keep the configured budget, do not bypass it.

## Remaining live gates and rollback

1. Publish reviewed images after CI; record revision/digests. Local builds are not
   proof that GitHub publishing or Vercel deployment succeeded.
2. Back up and apply pending migrations `20261009000001` and `20261009000002`, then
   require a passing database ledger/boundary check. Do not start new code first.
3. Configure actual credentials, enabled roles, DNS/TLS, redirects and notifications.
4. Verify login/tenant denial, chat stream completion/disconnect, telemetry SSE
   reconnect, signed agent ingestion, one small repo diff and authorized preview.
5. Observe whole-host RAM, swap, CPU, queue age, disk and container OOM/restarts.
   Stop expanding the trial if it thrashes or restarts. No resource cap proves
   the two 1 GB servers can support full Ryvix.
6. Record previous Vercel deployment and worker/static digests. Stop admissions,
   drain/expire active workspace jobs and previews before changing worker/image
   versions. Revert Vercel and workers to a compatible recorded revision on
   failure; keep additive schema and persistent volumes. Verify real behavior
   again, not just process liveness. Never replay ambiguous external writes.

Back up stopped per-role volumes and hosted Supabase separately. Native training,
full framework workspaces, all connector workers simultaneously and production
load certification remain outside this trial.
