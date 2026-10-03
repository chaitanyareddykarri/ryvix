# Ryvix development guide

Use npm workspaces and the repository lockfile. Production worker scripts use
Node's `--env-file-if-exists`; use the Node 22 environment used by verification.
Install dependencies with `npm ci`. Docker is for isolated customer coding
workspaces, not a local Supabase/PostgreSQL replacement. Use the existing hosted
Supabase project and verified TLS for incremental migration workflows.

## Configuration and commands

Keep secrets in ignored environment files or the deployment secret store. Refer to
[the provider plan](../docs/infrastructure/PRODUCTION_PROVIDER_PLAN.md) and
[worker deployment](../docs/infrastructure/WORKER_DEPLOYMENT.md) for exact settings.
Existing external LLM keys can be reused once connected to the running processes.

```sh
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run security:secrets
```

Preserve existing `ai/data` before tests and restore it afterward; tests can write
tracked runtime memory and weights. Never include those generated changes in a
source-code commit automatically. Use `npm run verify:database` for the read-only
hosted database boundary check with the established TLS configuration. Integration
verification scripts may create transactional fixtures; consult each script before
running it against any environment. Never reset the hosted database.

## Runtime processes

Web/API, coding worker (`npm run worker:workspaces`) and operations worker
(`npm run worker:operations`) are separate processes. The coding worker needs
approved Docker images, host ownership and preview routing. The operations worker
handles allowlisted cloud recovery, WhatsApp P1 and account email dispatch using
explicit feature flags and provider credentials. AI and customer containers receive
no unrestricted database/provider credentials.

## Current verification and next work

[Project status](../docs/PROJECT_STATUS.md) records migrations through
`20261003000004`, the latest code checks and all pending live acceptance work.
Do not infer a real reboot, email, WhatsApp delivery, browser check or deployment
from injected-provider fixtures. Reviewed learning uses `npm run train:reviewed`
and requires actual reviewed partitions; runtime memory is not training evidence.

## October 3 worker additions

Run the web/API plus separate coding, operations, experience and WhatsApp processes.
Use npm run worker:experience for opted-in collection/repository indexing and
npm run worker:whatsapp for assistant processing; the assistant requires
RYVIX_WHATSAPP_ASSISTANT_ENABLED=true. These do not replace the coding or
operations workers. Apply migrations through 20261003000004 first.
See [assistant setup](../docs/infrastructure/WHATSAPP_ASSISTANT.md) and [experience setup](../docs/infrastructure/EXPERIENCE_AND_MEMORY.md).
