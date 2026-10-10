# What the scripts directory does

`scripts/` holds executable entry points and shared operational helpers. Most
business logic lives in backend/services/ai. Scripts are not all daemons and do
not automatically execute when the web server starts.

| Group | Purpose and important boundary |
| --- | --- |
| `verify-railway-worker.mjs` | Tests the built Railway wrapper with a disposable root-owned Docker volume, denied roles, non-root runtime and graceful stop. No live database/provider access. |
| `verify-micro-compose.mjs` | Renders both Micro host configurations with dummy env files; checks default roles, tmpfs options, memory limits and Docker socket placement. Does not start services or inspect real host secrets. |
| `verify-vercel-boundary.mjs` | Audits web API dependencies for filesystem/process boundaries; optional `--traces` checks built output excludes ai/data. Not a live Vercel deployment test. |
| `verify-static-workspace.ts` | Exercises actual local Docker isolation, static checks, signed previews and fixture-backed task orchestration. Requires Docker; does not certify real providers or Oracle capacity. |
| `workspace-worker.ts` | Claims repository coding jobs and drives isolated Docker workspaces; holds a host advisory lock. |
| `operations-worker.ts` | Runs enabled recovery verification/approved dispatch and notification outboxes. It does not install detectors or bypass recovery approval. |
| `gmail-worker.ts` | Explicitly enabled allowlisted Gmail polling and maintenance, with session locks. |
| `whatsapp-assistant-worker.ts` | Processes authorized inbox work, notifications and durable replies when enabled. |
| `experience-worker.ts` | Opted-in experience collection and repository indexing; collection is not automatic model training. |
| `train-reviewed.ts` | Trains/evaluates a candidate from approved labeled partitions and records a checkpoint; does not activate it automatically. |
| `evaluate-ai.ts` | Scores supplied answers or explicitly requested live responses against authored rubrics; not universal quality or billing certification. |
| `evaluate-classifier.ts` | Evaluates the threat classifier on supplied held-out labeled events, not a bug/feature prompt classifier. |
| `verify-*-live.ts` | Individual probes with different side effects. Several use real SQL with rollback fixtures and injected providers; the word live does not prove SMTP/Meta/cloud delivery. Read each probe before use. |
| `verify-database-boundaries.mjs` | Read-only migration-ledger, RLS and grant checks. Does not statically prove every query is parameterized. |
| `check-secrets.mjs` | Focused credential regression scanner with reviewed fixture exceptions, not an exhaustive security proof. |
| `test-offline.mjs` | Blocks external network for tests and restores existing AI runtime files. |
| `verify-all.mjs` | Sequential local verification summary; optional read-only database/runtime checks. |
| `deploy.mjs` | Deploys an immutable web image, verifies revision health and attempts rollback; does not apply migrations or run all tests itself. |
| `apply-pending-migrations.ts` | Disabled compatibility entry point. Use numbered migrations with the established Supabase CLI workflow. |
| `delete-all-users.ts` | Destructive account purge, not harmless routine cleanup; excluded from verification and deployment. Never run on a real project as a health check. |
| `worker-database.ts` | Common TLS/keep-alive/error-handling configuration and bounded pool caps; one pool per calling process, no SQL retries. |
| `runtime-environment.mjs` | Loads local environment defaults without overriding injected settings and checks presence of model credentials; does not validate the OS or Node version. |
| `check-runtime-readiness.mjs` | Reports required runtime configuration and performs a verified-TLS read-only database probe; missing inputs cause failure. |

Use [worker operations](infrastructure/WORKER_OPERATIONS.md) for the corrected
resource plan and commands. Package metadata owns SMTP in `services`; web OTP and
team invitation routes still call that shared SMTP code. Three.js type definitions
are development dependencies. Neither change establishes a measured bundle or
resident-memory saving.
