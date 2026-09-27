# Working on Ryvix

Read `.ai/AGENTS.md`, `.ai/CONTEXT.md`, `.ai/RULES.md`, `.ai/ARCHITECTURE.md`,
and `.ai/SECURITY.md` before implementation. Consult `.ai/CURRENT_TASK.md`
and the relevant specification under `docs/` for the task at hand.

This npm workspace contains `web` (Next.js App Router), `backend` (authorization
and connectors), `ai` (reasoning), `services` (workers and coding workspaces),
and `packages/database` (shared database types and clients). Database migrations
are under `supabase/migrations`; tests are under `tests`.

Use `npm run typecheck` and `npm test` for verification. Tests can modify
tracked files under `ai/data`; preserve existing runtime data before running
them and do not automatically include generated memory or weights in commits.
Documentation contains historical test counts; report actual command results.

Keep secrets in ignored environment files. Authenticate mutations, scope them
to the authorized tenant, and preserve audit and approval boundaries. Follow
the existing GitHub and Supabase integration architecture. These are also the
relevant optional Codex plugins; verify connection status before using them.

Inspect local changes and fetch before synchronizing Git. Preserve concurrent
dashboard changes and avoid force pushes. Commit and push when the user requests
it; use a review branch for unresolved integration or review work.
