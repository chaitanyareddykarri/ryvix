# Oracle deployment phase 1 evidence - October 8, 2026

Implementation is on the local Testing_branch working tree. No Oracle resource,
DNS record, provider account, live message or production deployment was changed.

Implemented:

- Native ARM64 CI builds web, worker, Node sandbox and egress images and exercises
  Node architecture, Sharp, worker imports/data ownership and sandbox lifecycle.
  CD publishes matching revision-tagged images on an ARM runner.
- Worker Compose profiles deploy selected roles alongside web at one revision.
  Release checks reject omitted running roles and mismatched revisions. Failed
  releases restore previously running selected workers and previous web health.
- Docker inventory admission includes retained previews, reserves sidecars,
  serializes allocation and rejects unavailable/unbounded/orphan inventory.
  The job queue waits before claiming work when capacity is exhausted.
- Caddy configuration proxies app/preview streams over HTTPS with DNS-01 wildcard
  certificate files. Actual issuance, renewal and public routing need the domain.
- Separate writable AI volumes per role, developer-data build exclusions and a
  stopped-writer backup helper plus restore procedure.
- Explicit provider/model selection for chat and coding; selected-provider failure
  cannot silently invoke a different provider or deterministic fallback.
  `npm run verify:model -- --live` is an explicit opt-in real API acceptance probe.
- ARM execution caught a missing Sharp libvips shared library in standalone web
  packaging. The Dockerfile now preserves target-platform `@img` native packages.

Verification recorded so far:

- Typecheck, lint, isolated production workspace build and secret scan passed.
- Offline suite: 97 application suites plus 34 Node tests passed.
  Runtime wrapper restored twelve AI files byte-for-byte.
- Browser suite: 185 passed and one 30-second timeout under concurrent builds.
  The timed-out reset-password 375px case passed on isolated retry.
- Docker Compose configuration validates; Caddy adapts the supplied configuration.
- ARM64 Node and egress images build and execute on this x86 Docker host through
  emulation. Actual sandbox checks passed non-root/read-only/capability limits,
  file/path safety, Git diffs, restricted registry egress, metadata rejection,
  preview grant exchange/proxying and recovered cleanup. A second run also
  verified actual inventory admission rejects a second retained allocation.
- Backup and restore on dedicated disposable Docker volumes preserved content
  and UID 1000. Test volumes were removed; the ignored backup archive remains.
- Corrected web image and all four ARM64 images passed the final runtime probe:
  native Sharp PNG generation, HTTP health/release revision, worker runtime
  imports and UID-owned data writes. The first attempt timed out starting the
  Node sandbox container; the full isolated retry exited successfully. Evidence:
  ignored local logs `tmp/pilot-arm-runtime-final.log` and
  `tmp/pilot-arm-runtime-retry.log`. This was ARM emulation on an x86 Docker host,
  not a native ARM CI run.

Remaining external acceptance: native ARM CI has been added but has not run for
this unpushed change; actual Oracle performance/host installation, public DNS/TLS
renewal, Supabase restore and the operator-selected live model/account remain
unverified. Emulation is not native hardware certification. Five previously
recorded development audit findings remain a separate dependency issue.

See [release runbook](../infrastructure/ORACLE_RELEASE_RUNBOOK.md) and
[full rollout plan](../infrastructure/ORACLE_PILOT_DEPLOYMENT.md).
