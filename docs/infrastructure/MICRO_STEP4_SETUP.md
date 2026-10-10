# Step 4: account, domain and protected configuration setup

## Release selected

Step 3 completed: PR #2 merged; main and Testing_branch matched
`53d9229fc51e29826c7b551db1a234bd0f81d12f`. Main CI and native AMD64 image
publication succeeded. Both registry manifests were checked as linux/amd64.

- [Main CI](https://github.com/chaitanyareddykarri/ryvix/actions/runs/38024658428)
- [Image publication](https://github.com/chaitanyareddykarri/ryvix/actions/runs/38024658433)
- Worker: `ghcr.io/chaitanyareddykarri/ryvix-micro-workers@sha256:2bd18b9828754b1af983da3c0e9f2d7e3c3b6b0f8b9794ffc1876c331f17d6cb`
- Static/relay: `ghcr.io/chaitanyareddykarri/ryvix-micro-static@sha256:fb3894682f2ee5995a23e36f596d1e9fc0ba5466e2727a9e7689913ccdff4310`

## Prepared locally

The ignored `tmp/step4-preparation/` directory contains release, operations,
workspace and Vercel example files. Image fields are pinned to the digests above;
credentials and domain placeholders remain empty/unresolved. These are not
usable production secrets files. Canonical templates remain under
`infrastructure/micro/`. Never commit populated copies.

No local Vercel project link was found. Step 4 SSH attempts to both published VM
addresses timed out on port 22. No remote host configuration was changed, and
the timeout does not diagnose an incorrect SSH key. Domain/DNS provider and
Vercel account/project details are still required.

## User first actions

1. Sign into Vercel and open Add New Project. Select the GitHub repository
   `chaitanyareddykarri/ryvix`. If already imported, use that existing project.
2. Select Next.js and root directory `web`. Allow source files outside the root
   directory. Use Node 22; the checked-in vercel.json supplies install/build
   commands. Pause before Deploy until required environment variables are set.
3. Provide the project name and domain/DNS provider name, without credentials.
   A Vercel-assigned web address can be used initially, but Oracle previews need
   a separate configured wildcard hostname and certificate under this design.
4. Try SSH from the user's PowerShell using the previously successful key paths.
   If it also times out, confirm the VMs are running and their public IPs, route
   tables and port 22 rules still permit the current connection. Do not assume
   the prior home IP is still current or blindly replace firewall rules.

## Continue when access and names are known

- Select final app and preview origins before configuring redirects, signing
  mappings, DNS and certificates. Preview wildcard DNS points to VM 2, not Vercel.
- Set APP_BASE_URL to the final HTTPS app origin: the GitHub authorize route
  reads this variable and otherwise defaults to localhost. Match the GitHub OAuth
  app callback to that origin plus /api/auth/github/callback. RYVIX_PUBLIC_URL
  configures the separate Supabase authentication callback flow.
- Privately configure Supabase, verified-TLS database connections, model settings
  and required signing/OAuth secrets. Preserve existing encryption/signing keys
  where persisted data depends on them; do not rotate them blindly.
- Use a session/direct database connection for lock-holding workers. Vercel uses
  a suitable pooled connection with the configured per-process connection cap.
- Install host files under /etc/ryvix with directory mode 0700 and file mode 0600;
  fill Docker group ID from VM 2. Grant only required registry read access and
  verify both hosts can pull the selected digests without printing credentials.
- Configure wildcard TLS and renewal, then verify firewall and preview isolation.
  Do not start workers during configuration: data backup/migrations/rollback are
  Step 5, deployment and live acceptance follow.

Official setup references: [shared monorepo source](https://vercel.com/docs/monorepos/monorepo-faq)
and [environment settings](https://vercel.com/docs/environment-variables).
