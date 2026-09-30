# Repository worker deployment

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
one worker host: durable host assignment and multi-host preview routing remain
unverified. Configure wildcard HTTPS routing to that host's preview gateway.

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
