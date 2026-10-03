# Repository worker deployment

## Implementation checkpoint — 2026-10-03

Code checkpoint: `d81b281`; applied migrations through `20261003000004`.
Implemented: reviewed experience/personal memory, bounded repository indexing,
Gmail SMTP email, WhatsApp OTP identity, opt-in AI replies/history/quotas, confirmed
coding requests, task notifications and authenticated approval handoffs. Releases
and server operations retain their existing web authorization and approval checks.
Recorded verification: 79 project suites plus 15 Node checks, typecheck/lint/build
and 125 database boundary checks passed. Provider delivery, deployed workers/browser
acceptance and representative model accuracy remain unverified.

See [project status](../PROJECT_STATUS.md), [assistant setup](WHATSAPP_ASSISTANT.md) and
[recorded verification](../verification/WHATSAPP_ASSISTANT_2026_10_03.md). This documentation update did not rerun those
code checks. Detailed designs below may include planned capabilities; the status
index distinguishes implemented behavior from future work.


## Continuation: worker ownership (2026-10-02)

Migration `20261001000006` is applied. Each Docker host now requires a stable
`RYVIX_WORKER_HOST_ID` and a shared `RYVIX_WORKER_PREVIEW_DOMAINS` JSON map, for
example `{"worker-a":"a.preview.example.com","worker-b":"b.preview.example.com"}`.
On each worker, `PREVIEW_BASE_DOMAIN` must match that host's entry. Web receives
the same allowlist and signing configuration. Route each host-specific wildcard
domain through HTTPS to that host's loopback gateway; provision matching TLS.
Do not reuse a domain or host ID for different Docker daemons.

The worker holds a PostgreSQL advisory lock for its host for its process lifetime.
Claims/sessions persist host ownership; cleanup and restored previews are scoped
to it. Web signs persisted preview metadata without Docker access. Historical
sessions with no host assignment deliberately fail closed: inspect their real
Docker identity before assigning ownership; never bulk-guess a host.

Local Docker verification passes with the existing verification images. Those
tags are test evidence, not approval of production image contents. Select reviewed
production image digests, configure the model/Vault credentials and public URLs,
run the readiness probe on the designated server, then start its worker service.
Real multi-host proxy routing and deployed worker execution remain unverified.

The web production Compose service does not start the repository worker. Deploy
the worker separately using `infrastructure/ryvix-workspace-worker.service` on
the trusted Linux Docker host. Customer source, install scripts, tests and builds
execute inside disposable containers on that host. They do not execute directly
on the host or on the customer's monitored application server.

Install the reviewed repository revision at `/opt/ryvix/current`, install its
dependencies (including `tsx`), and create the trusted `ryvix-worker` account.
The supplied service uses `/usr/bin/node`, Docker CLI/daemon access, and
`/etc/ryvix/worker.env`. Restrict that environment file to trusted operators.
Docker group access is privileged; only the control-plane worker receives it.
Customer containers never receive the Docker socket or the worker environment.
Before connecting to the queue, worker startup checks for a reachable Linux Docker
engine and locally installed Linux Node/egress images. Both images must appear in
`RYVIX_WORKSPACE_IMAGES`. Failure exits before claiming a task; systemd retries
according to its restart policy. This check never pulls or runs an image and does
not certify image contents, provider connectivity or the remaining stack images.
The `ai/data` directory must exist and be writable by the worker account.

Supply verified-TLS database configuration, approved workspace images and image
allowlist, the egress image, preview domain/signing configuration, public app URL,
and at least one supported cloud model credential in the worker environment.
Supply the web application's corresponding settings separately. Use the same
reviewed release revision for web and worker. The systemd unit does not load
`web/.env.local`; production credentials must be injected into its environment.

The coding call uses the existing model gateway, with `requireProvider: true`.
Groq, OpenAI, Claude, Gemini and Hugging Face credentials are supported; xAI Grok
is not registered. Provider inference produces structured file changes; Ryvix
validates and applies them. No local Ryvix coding-model training is required.
Ollama remains a gateway fallback, but the cloud deployment readiness check
requires a cloud credential. Credential presence does not prove API availability.

Run `npm run verify:runtime` using the intended server environment and run
`npm run verify:workspace` on the Docker host before starting the service.
Exported server settings take precedence over local files in the readiness check.
Install/enable the supplied unit only on the designated worker server. Start with
one worker host initially; host assignment is now implemented, while live
multi-host preview routing remains unverified. Configure wildcard HTTPS routing
to the owning host's preview gateway.

Complete rollout evidence requires an authorized repository task through the real
web UI: credential retrieval, clone, external inference, file changes, applicable
checks, diff persistence, preview and explicit PR approval. A successful build of
Ryvix alone does not establish this flow. The current coding pass uses at most ten
selected source files and fails the task on check failure; it does not invoke the
legacy self-debug helper automatically. Provider/model details returned by the
gateway are not currently persisted by the repository task result.

## Verification checkpoint: 2026-10-01

65 project suites and 12 Node tests passed; workspace typechecks passed.
The read-only runtime probe verified database TLS, required tables and no missing
migration ledger entries. Readiness still fails: no supported cloud credential,
preview domain/signing secret, public URL, agent release manifest, workspace Node
image or egress image is configured in the inspected environment. These results
do not establish the configuration or availability of any remote production host.

## October 3 worker additions

Run the web/API plus separate coding, operations, experience and WhatsApp processes.
Use npm run worker:experience for opted-in collection/repository indexing and
npm run worker:whatsapp for assistant processing; the assistant requires
RYVIX_WHATSAPP_ASSISTANT_ENABLED=true. These do not replace the coding or
operations workers. Apply migrations through 20261003000004 first.
See [assistant setup](WHATSAPP_ASSISTANT.md) and [experience setup](EXPERIENCE_AND_MEMORY.md).
