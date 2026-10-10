# Railway workers with a local Docker workspace

The current trial defers AWS. Vercel retains web/API routes, Railway runs selected
background workers, and the Windows computer runs the workspace worker against
Docker Desktop Linux containers. Jobs/results pass through hosted Supabase.
Railway does not connect to a public Docker daemon. Never expose port 2375 or
mount the Docker socket into customer containers.

Start with one static HTML/CSS/JavaScript session. No npm installs or framework
builds are enabled by this configuration. Keep the computer awake, online and
Docker Desktop running; local workspaces/previews are unavailable otherwise.

Copy infrastructure/railway/local-workspace.env.example to .env.workspace.local
at the repository root. Supply only the worker's database/model credentials.
Use a direct/session pooler database URL, not transaction pooling. The file is
ignored by Git. Do not overwrite existing production environment files.

Before starting a real worker, verify migrations and database access, configure
a stable wildcard HTTPS preview route to local 127.0.0.1:8081, and configure the
same PREVIEW_SIGNING_SECRET and worker-domain map on Vercel. Preserve each
session hostname through the reverse proxy. A random single-host tunnel is not
sufficient for the existing session subdomain contract. DNS/tunnel/provider
setup is still pending; do not invent a working URL.

Build/verify the isolated local fixture from PowerShell in D:\Ryvix:

```powershell
docker build -f infrastructure/workspaces/Dockerfile.static -t ryvix-micro-static:local .
$env:RYVIX_WORKSPACE_STATIC_IMAGE='ryvix-micro-static:local'
node --import tsx scripts/verify-static-workspace.ts
```

After the external prerequisites are verified, start in a dedicated terminal:

```powershell
node --env-file=.env.workspace.local --import tsx scripts/workspace-worker.ts
```

This is the trusted Node worker on Windows; customer code stays in isolated Linux
containers. Do not use scripts/worker-entry.mjs directly on Windows: that image
entrypoint expects /app/ai/data. Do not run two workers with the same host ID.
Starting this worker can consume real queued jobs; the fixture above does not.
Local fixture success does not establish hosted database, model or public-preview
acceptance. Verify one authorized real repository flow before admitting users.
