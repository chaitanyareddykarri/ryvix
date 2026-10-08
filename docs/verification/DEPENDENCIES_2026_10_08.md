# Dependency and unused-file audit - October 8, 2026

The pasted audit was partly stale. This review checks the local working tree;
it does not certify deployed services or remote branch parity.

## Corrections

- Removed duplicate web Nodemailer/type declarations and moved Three.js types
  to development dependencies (already completed in the preceding local phase).
  Services still owns SMTP, including email flows called by the web app.
- Upgraded Next.js from 15.5.25 to 15.5.27 and raised its manifest minimum.
  The registry reported a new moderate Next advisory before this update.
- Declared the web application's PostgreSQL and services imports, its ESLint
  configuration dependency, and PostgreSQL development types in web/backend.
- Declared existing AI/services workspace imports. This records their existing
  bidirectional coupling; it is not an architectural decoupling or a guarantee
  that these source workspaces can be published independently.
- Moved root PostgreSQL and tsx to runtime dependencies: production worker
  commands import both, so omitting development dependencies must retain them.
- Removed unused `web/utils/task-artifacts.ts`. No caller referenced it; the
  active write remains in `RepositoryJobStore.complete`, with worker ownership,
  transaction and audit checks.

## Source audit scope

An AST scan initially inspected 432 JS/TS source files, then 431 after cleanup.
It found no unresolved literal imports. After manifest fixes it found no
undeclared package imports in the five checked application workspaces, treating
type-only PostgreSQL imports as satisfied by their declared types package.
This is static evidence, not proof of every computed import or deployed path.

Retained apparent orphan candidates: backend's package entry point, AI's small
compatibility export barrel, and `operation-access.ts`, which is loaded through
the VM-based operation audit test. Framework routes, standalone tools and ignored
temporary logs are not automatically unused. Test file counts do not establish
registration; the actual executed results below are the relevant evidence.

## Remaining dependency findings

Five high audit findings remain in the development ESLint dependency chain:
braces, micromatch, fast-glob, @next/eslint-plugin-next and eslint-config-next.
[The braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
lists no patched version. They remain visible; no force downgrade, audit
suppression or unreviewed replacement was applied. Development tooling can still
be exposed when processing untrusted input; development-only does not mean safe.

The [Next advisory](https://github.com/advisories/GHSA-4jqv-mc3x-m676)
identifies 15.5.27 as patched. Its stated scenario concerns Pages Router SSG/ISR;
Ryvix uses App Router. This update does not claim that Ryvix was exploitable.

## Verification

- `npm ls --all`: no dependency-tree problems.
- `npm audit --omit=dev`: zero reported vulnerabilities; full audit: five high.
- Typecheck and lint passed.
- `npm run test:offline`: 97 application suites and 30 Node tests passed;
  twelve AI runtime files restored byte-for-byte.
- Isolated production workspace build passed with Next.js 15.5.27; original
  Next-generated configuration files restored. All 186 browser fixtures passed.
- Secret scan: zero findings. Git whitespace check passed.

The first typecheck overlapped package replacement and saw temporarily missing
Next declarations; the clean post-install rerun passed. npm could not remove an
old SWC binary held by the running development process. The new version installed
successfully; restart that development server to load it. No active process was
stopped and no runtime data was deleted. Publication target is Testing_branch; main promotion remains a separate step.
