# ADR 046: Two Micro VMs and Vercel trial

Date: 2026-10-10. Status: implemented for local validation, live rollout pending.

The selected experiment uses Vercel for Next.js UI/API routes, VM 1 for selected
background roles, and VM 2 for a single restricted static workspace. Supabase
remains hosted. Chat inference orchestration stays in the Vercel API; channel
orchestration runs in its selected worker; repository planning runs in the
workspace worker. All inference calls use external providers. There is no new
generic AI HTTP server on VM 1 and no locally hosted language model.

An explicit `RYVIX_WORKSPACE_MODE=static` accepts only small regular text snapshots:
root index.html, HTML/CSS/browser JS and documentation. It rejects package
manifests, executables, hidden paths, symlinks and submodules. GitHub tree/blob
snapshots are bounded before admission/materialization; no Git history is cloned.
Trusted Git initialization records the snapshot solely for measured diffs; the
original GitHub base SHA remains the concurrency reference for existing PR writes.

The static image holds trusted tooling outside /workspace. Customer scripts are
never run on the server: only JS syntax parsing and file bounds are checked.
The static HTTP server serves a validated in-memory snapshot, never .git or a
filesystem traversal. JS may run in the user's isolated browser preview. There
are no package installs, dependency downloads, framework builds or arbitrary
commands. Network stays internal; no egress broker may be enabled. The existing
signed, expiring, sandboxed preview gateway remains mandatory.

One 192 MiB/0.25 CPU sandbox plus one reserved 128 MiB/0.5 CPU preview relay is
admitted. The worker has a separate 256 MiB cap. These are initial resource caps,
not a throughput guarantee for the Micro's fractional CPU baseline. The sandbox
has no additional swap allowance; host/worker swap is only a buffer. Standard
workspace limits remain unchanged. Operators must measure the whole host before
admitting pilot users; unsupported repositories fail visibly, not via fallback.

Vercel API imports exclude the service barrel and Docker manager. Preview grants
are independent of the worker listener. No developer ai/data is shipped or used
as durable web state; authorized conversation, lessons and usage remain in the
database. Read-only legacy classifier weights remain disabled in production.
Request time limits and small per-process pools bound serverless execution;
process-local maps are optimizations, not fleet-wide concurrency guarantees.

Separate native AMD64 CI builds/test/publishes opt-in micro images; existing ARM
deployment is preserved. The new workflow never connects to production hosts.
Protected per-role configuration and volume ownership remain explicit. Host
network and Docker socket are granted only to the trusted workspace worker,
never to customer containers. Do not run untrusted CI on either production VM.
