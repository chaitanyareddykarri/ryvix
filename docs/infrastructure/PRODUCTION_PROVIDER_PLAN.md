# Ryvix provider and deployment plan

Current deployment plan (October 8): [Oracle pilot rollout](ORACLE_PILOT_DEPLOYMENT.md).
Oracle hosts Next.js UI/APIs and separate workers; Supabase stays hosted and
model inference uses an external API. Finish ARM64/resource/deployment work,
prepare accounts in parallel, then activate providers on a restricted HTTPS
deployment before public launch. The plan records acceptance gates and does not
claim that infrastructure or real integrations are deployed.

The linked plan supersedes the historical sizing and rollout order below.
The provider inventory remains useful; consult current feature runbooks where
older sections describe subsequently implemented capabilities as missing.

## October 7 implementation update

All numbered database migrations through `20261007000001` are applied. Next
rollout work is deployment and authenticated workflow acceptance. Google login
activation remains deferred until deployment; use the
[Google setup guide](../integrations/GOOGLE_LOGIN.md). Phone contact saving and
server-only environment creation do not require Meta or GitHub credentials.

October 4 update: [current capability setup and limits](CAPABILITY_PROVIDERS.md). Gmail push/reviewed replies, additional P1 transports, measured response usage, bounded semantic retrieval and separate external-training dataset preparation now have implementations. Prior descriptions of these features as wholly absent are superseded; provider verification and actual external training remain pending.


This plan follows the current repository architecture. Accounts/configuration
alone do not certify live delivery, model quality or server recovery.

## Accounts and providers

Current implementation and evidence: [project status](../PROJECT_STATUS.md).

| Capability | Provider required | What to provision |
| --- | --- | --- |
| Database, login, tenant data, Vault | Existing Supabase Cloud project | Project URL, browser publishable key, trusted backend database connection with verified TLS, Auth redirect URLs and backups. Keep this hosted database. |
| Git repositories, PRs, webhooks, CI and images | GitHub and GitHub Container Registry | Existing repository; project-scoped repository credential stored through Connections in Vault; OAuth client if browser OAuth is used; webhook secret; registry publish/pull permissions; production runner. Current browser OAuth reads `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`; `GITHUB_APP_*` example fields do not alone configure that flow. |
| LLM chat and coding | Reuse an existing supported external provider | One working key/model is sufficient initially: Groq, OpenAI, Anthropic, Gemini or Hugging Face. Exact runtime names below. A separate new subscription is not inherently required. |
| Optional semantic reranking | Gemini embedding API in the current implementation | `GEMINI_API_KEY` and `GEMINI_EMBEDDING_MODEL`. Lexical retrieval still works without embeddings. Other embedding providers need an adapter. |
| Web and workers | One Linux VM/cloud provider | Choose AWS EC2, DigitalOcean, Hetzner or GCP. Recommended layout: one control-plane VM and a separate Docker worker VM. Initial sizing estimate: control plane 2 vCPU/4 GB; worker 4 vCPU/8 GB or more with one active workspace. Measure before increasing concurrency; each sandbox can require 2 vCPU/4 GB. |
| Domain, DNS and HTTPS | Your registrar/DNS provider, ACME certificates | Application hostname and a separate preview domain. Automate wildcard TLS with DNS-01. Cloudflare DNS is an option; an existing DNS provider is also suitable if certificate automation is available. |
| Login OTP email | Your configured Gmail SMTP account | Application SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and optional EMAIL_FROM. Hosted Supabase Auth SMTP is configured separately. |
| Gmail task inbox | Google Cloud project + Gmail API + Google OAuth | OAuth consent configuration, client ID/secret, approved test users or production verification, authorized callback `https://APP_HOST/api/channels/gmail`. Users connect their Gmail account; refresh tokens are stored in Vault. Current scope is `gmail.readonly`. |
| Security and approved-deployment email | Your Gmail SMTP account | Same SMTP settings on the operations worker; optional RYVIX_NOTIFICATION_FROM, public application URL and worker enable flag. Users opt in at /notifications; recipient must be their confirmed account address. Gmail OAuth is not required to receive these emails. |
| WhatsApp task messages and P1 alerts | Meta WhatsApp Cloud API | Business portfolio, Meta app, WhatsApp Business Account, registered business phone/phone ID, suitable access token, app secret, webhook verify token, approved P1 template, language and opted-in recipient records. Twilio is an alternative provider but the current adapter calls Meta directly. |
| Native server monitoring/restarts | Ryvix Linux agent | Release binaries/checksums, public HTTPS release manifest, enrollment, pinned signing public key, exact service allowlist and narrowly scoped systemd permissions. No extra messaging provider is needed for agent telemetry. |
| Out-of-band cloud reboot | The provider that owns each customer instance | Exact registered-server to provider-instance mapping and scoped cloud credentials on the operations worker. Hosting Ryvix on one cloud does not grant access to another customer's instances. |
| Optional Slack/PagerDuty/SMS | The selected channel's provider | Not required for the initial Gmail/WhatsApp rollout. Existing payload builders do not establish live transport. SMS or voice would require an implemented adapter and an account such as Twilio. |

The current PostgreSQL-backed repository queue does not require buying Redis for
this rollout. Kubernetes, a paid vector database and a separate AI training cloud
are also not prerequisites for this deployment.

### Existing LLM credentials

The gateway currently reads:

| Provider | Secret name | Model override |
| --- | --- | --- |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL` |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` |
| Anthropic | `ANTHROPIC_API_KEY` (chat also accepts `CLAUDE_API_KEY`) | `CLAUDE_MODEL` |
| Google Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` |
| Hugging Face | `HUGGINGFACE_API_KEY` or `HF_TOKEN` | `HUGGINGFACE_MODEL` |

Use `ANTHROPIC_API_KEY` consistently for Anthropic. Install your existing selected
credential in both the web and coding-worker secret environments; configure
`RYVIX_CHAT_PROVIDER` where a specific chat provider is desired. Do not paste keys
into documentation or browser/public environment variables. A generic external
gateway key does not automatically work as a named provider key; it needs the
matching endpoint/protocol adapter.

The October 2 inspection found none of these keys in the current process or the
normal `.env`, `.env.local`, `web/.env.local` defaults. This does not mean a key you
previously supplied is invalid or absent from a remote secret store. Its deployment
location still needs to be connected to the running processes. Runtime presence,
a successful live request and answer quality are separate checks.

See [WhatsApp assistant](WHATSAPP_ASSISTANT.md) for OTP identity, opt-in AI replies,
confirmed coding, notifications, approval handoffs and the SMTP correction.

## How communication works

October 2 follow-up: account email notifications and explicit protected-branch
release approval are now implemented. See `EMAIL_AND_RELEASES.md` for configuration.
Security and deployment-result emails use configured SMTP to the verified account email;
they do not require Gmail read/send OAuth. Existing Gmail task polling is separate.

**Gmail:** user connects mailbox → authenticated polling reads new mail → tenant
inbox proposal → a user reviews and accepts → a coding task is created. Pub/Sub
push, automatic reply delivery and a free-form email conversation are not part of
this implementation. Sending replies requires `gmail.send` consent and a sender
workflow; the current read-only grant cannot send mail.

**WhatsApp inbound:** user messages the business number → Meta signed webhook →
tenant inbox proposal. Verified, opted-in users can use the separate assistant
worker for answers, scoped status and confirmed coding requests. Conversation
history, quotas, reply dispatch and service-window handling are implemented.
Unlinked or disabled users retain web review. Phone possession never grants roles.
PR/release/server approvals use authenticated web handoffs, not a generic YES.

**WhatsApp P1 outbound:** a persisted open `P1_critical` incident → matching
configured connector and opted-in recipient → deduplicated outbox → Meta template
send → stored provider message ID → signed sent/delivered/read/failed callback.
The approved template has exactly one text parameter: the incident UUID. Put the
application's fixed incident-review URL in the template text. Incident details or
secrets are not copied into notifications. See `/channels/alerts` for delivery.
This workflow provides no approval through WhatsApp buttons.

**Cloud recovery:** `/recovery` request → different current administrator approves
the exact displayed instance → operations worker claims durably → one provider
reboot request → recorded acceptance/unknown result → running-state probe and a
fresh signed agent heartbeat. “Observed healthy” is post-request liveness, not
proof that the instance rebooted or that its application is healthy.

## Deployment sequence

October 3 addition: apply migrations through `20261003000002`, deploy the
[experience worker](EXPERIENCE_AND_MEMORY.md), and explicitly opt projects into
collection. This worker needs the existing trusted database connection, no new
LLM subscription. Live answer evaluation reuses a configured provider; external
fine-tuning is not automatically enabled by collection or user memory.
Optional [repository indexing](REPOSITORY_KNOWLEDGE.md) uses the same worker with
its own enable flag and repository opt-in, and the existing project GitHub token.

1. **Choose the first environment.** Select one hosting provider, the application
   domain, a distinct preview domain, an authorized test repository, and an
   authorized disposable server for recovery verification. Start with one worker.
2. **Database first.** Review and apply numbered migrations using the established
   Supabase CLI workflow with verified TLS. Never reset production. The new
   latest applied migration is `20261003000002` (repository knowledge), following
   `20261003000001` (experience/memory). Verify RLS and protected-table
   grants. Configure Supabase Auth public URL, redirects and transactional SMTP.
3. **Prepare Linux hosts.** Install the selected release at `/opt/ryvix/current`,
   Node dependencies including `tsx`, Docker on the coding host and trusted service
   accounts. Keep the operations worker off customer execution hosts. It needs no
   Docker socket. Production API/worker credentials stay outside customer sandboxes.
4. **Publish immutable images.** Build the web image and
   `infrastructure/workspaces/Dockerfile.node` and `Dockerfile.egress`; publish to
   GHCR and install approved digests on the worker. Set
   `RYVIX_WORKSPACE_NODE_IMAGE`, `RYVIX_WORKSPACE_EGRESS_IMAGE`, and their exact
   `RYVIX_WORKSPACE_IMAGES` allowlist entries. Configure other language images only
   for the stacks actually supported and verified.
5. **DNS and TLS.** Example: `app.example.com` serves web/API; use a separately
   registered preview domain such as `*.a.example-preview.net` for worker A.
   Set `RYVIX_PUBLIC_URL`, `PREVIEW_SIGNING_SECRET`, `RYVIX_WORKER_HOST_ID=worker-a`,
   `RYVIX_WORKER_PREVIEW_DOMAINS={"worker-a":"a.example-preview.net"}` and matching
   `PREVIEW_BASE_DOMAIN` on that worker. Terminate public HTTPS and proxy to the
   loopback gateway. Web receives the shared domain map/signing settings.
6. **Deploy web and coding worker.** Use the existing production Compose/CD setup
   for web and `ryvix-workspace-worker.service` for coding. Run readiness and Docker
   workspace verification on the intended host. Configure the production GitHub
   runner/environment, registry access and deployment enable flag only when ready.
7. **Connect actual providers.** Reuse the selected LLM credential; connect the
   test GitHub repository in Vault; configure Gmail OAuth and Meta app. Register
   public webhook URLs and verify signatures. Gmail redirect is the route above;
   Meta webhook is `https://APP_HOST/api/webhooks/whatsapp`.
8. **Enable operations individually.** Install `ryvix-operations.service` with
   `/etc/ryvix/operations.env`. Cloud uses `RYVIX_CLOUD_RECOVERY_ENABLED=true`,
   `RYVIX_CLOUD_TARGETS` and the chosen provider credentials. WhatsApp uses
   `RYVIX_WHATSAPP_ALERTS_ENABLED=true`, `WHATSAPP_GRAPH_VERSION` and
   `RYVIX_WHATSAPP_ALERT_TARGETS`. Resolve unknown outcomes before issuing another
   operation; the worker never automatically retries an ambiguous mutation.
   Enable account email with `RYVIX_EMAIL_NOTIFICATIONS_ENABLED=true`,
   the configured `SMTP_*` credentials and an authorized
   `RYVIX_NOTIFICATION_FROM`; users opt in at `/notifications`.
9. **Release and enroll the agent.** Publish versioned Linux amd64/arm64 binaries,
   verify checksums and configure `RYVIX_AGENT_RELEASE_MANIFEST`. Pin command keys
   and allowlists independently, then verify actual signed telemetry and one
   approved service restart on the designated test server.
10. **Run live acceptance.** Login/OTP; Gmail task intake; WhatsApp task intake and
    P1 delivered receipt; one real coding task through clone → LLM change → Docker
    checks → public preview → explicit PR approval → owner/admin release approval
    at `/releases` → protected-branch merge → customer CI/CD → matching signed
    deployment webhook → account email; verify real security email and
    runtime observation; independently approved cloud recovery on the test server.
    Check browser behavior and provider streaming. These require real accounts.
11. **Enable controlled learning.** Supply representative reviewed tenant examples,
    keep train/validation/test partitions independent, run scheduled training,
    review measured held-out results and explicitly promote. No production quality
    number is available merely because fixture checks pass.
12. **Scale after evidence.** Add another stable host ID, domain and certificate,
    then verify cleanup/preview isolation. Size database connections, image storage
    and task concurrency using measured load. Preserve unknown-operation journals
    and retain a previous application image for rollback; keep additive migrations.

Cloud credentials: AWS uses `AWS_REGION` and the SDK credential chain (prefer a
scoped instance role; environment credentials also work); DigitalOcean uses
`DIGITALOCEAN_TOKEN`; Hetzner uses `HETZNER_TOKEN`; GCP currently uses
`GCP_ACCESS_TOKEN`, which needs rotation before expiry. The current worker targets
operator-configured accounts. Self-service customer cloud credential onboarding
and automatic GCP token refresh need further implementation.

## Primary provider references

- [Supabase production SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend with Supabase](https://resend.com/supabase)
- [Google Gmail scopes and verification](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Meta Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Meta delivery webhooks](https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference)
- [EC2 reboot API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_RebootInstances.html)
- [GitHub App versus OAuth permissions](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps)
- [Let's Encrypt DNS-01](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge)
- [DigitalOcean Linux VMs](https://docs.digitalocean.com/products/droplets/getting-started/quickstart/)
