# Post-deployment checklist

Updated October 9, 2026. Hosting selection is deferred. Install required secrets
during service setup, before enabling public traffic; then perform these checks
on the deployed services. Local ignored environment files do not travel with Git.

## AI settings: both web and coding worker

- [ ] Add `GEMINI_API_KEY` and `GROQ_API_KEY` to each service's protected secrets.
      Rotation is recommended because the original keys were disclosed in chat.
      Never put secret values in this document, source, images or browser variables.
- [ ] Set `RYVIX_MODEL_PROVIDER=gemini`.
- [ ] Set `RYVIX_MODEL_FALLBACK_ORDER=gemini,groq`.
- [ ] Set `GEMINI_MODEL=gemini-3.5-flash`.
- [ ] Set `GROQ_MODEL=openai/gpt-oss-120b`.
- [ ] Leave `RYVIX_CHAT_PROVIDER` unset or set it to `gemini`.
- [ ] Apply the same applicable settings to WhatsApp or other model-using workers.
- [ ] Restart/redeploy services and confirm configuration without logging secrets.
- [ ] Verify each provider independently with a small request; model availability
      and account quota may have changed since local acceptance.
- [ ] Verify deployed chat streaming, saved history, and structured coding output.
- [ ] Verify controlled primary-failure fallback using a test harness; do not
      deliberately exhaust real quotas or expose a public failure-injection API.
- [ ] Verify both-provider failure, cancellation and interrupted-stream behavior.
- [ ] Confirm actual provider/model and attempt usage appear in authorized records.

See [AI fallback behavior and limits](../integrations/AI_PROVIDER_FALLBACK.md).
Context compaction and durable automatic quota-wait resumption remain unimplemented.

## Application and integrations

- [ ] Final HTTPS application origin and Supabase Site URL/redirect allowlist.
- [ ] Google login plus manual signup, verification email and password recovery.
- [ ] GitHub OAuth/webhooks and authorized test repository access.
- [ ] Email sender setup; actual notification receipt.
- [ ] Meta credentials, approved templates, HTTPS webhook and actual OTP/replies.
- [ ] Optional Gmail/channel workers only after their provider setup is complete.
- [ ] Database connectivity, migration status, tenant isolation and backup restore.
- [ ] Selected sandbox backend implemented, provisioned and verified (Railway
      managed-sandbox integration is not implemented by the AI fallback changes).
- [ ] Full coding task -> isolated tests/build -> authenticated preview -> approval
      -> GitHub PR, with no automatic production deployment claim.
- [ ] Resource limits, preview expiry, restart recovery, monitoring and rollback.
- [ ] Authenticated desktop and real phone browser acceptance.

Passing local provider probes does not complete these deployed acceptance gates.
