# AI provider fallback

October 9: gateway now bounds history extractively; pre-plan coding jobs can defer
quota failures up to three times using migration 20261009000002. Current request
and instructions are never truncated. Interactive streams still require retry.
See [current evidence](../verification/NONDEPLOYMENT_2026_10_09.md); older missing
compaction/resumption statements below describe the October 8 checkpoint.

Implemented locally on Testing_branch. Following explicit user authorization,
credentials were installed only in ignored `.env.local` and `web/.env.local`.
Rotation remains recommended because these credentials were disclosed in chat.
No credential values are included in this document or tracked source.

## Live activation checkpoint

Local primary: `gemini` / `gemini-3.5-flash`; backup: `groq` /
`openai/gpt-oss-120b`. Both providers passed small live completion and streaming
probes. The configured primary passed structured JSON and streaming through the
gateway. A simulated primary HTTP 429 followed by a real Groq request passed.
Gemini 2.5 Flash returned HTTP 404 despite appearing in model discovery; Gemini
3.8 streaming was unreliable in these probes, so neither is the selected model.

These checks establish provider connectivity, not full coding-task quality,
sandbox execution, browser acceptance or deployment readiness. Restart existing
processes to load changed environment settings. Deployment secret stores still
need both keys and all nonsecret settings below; ignored files are not published.

## Configuration

Install these settings in protected local environment files, then in BOTH the
deployed web service and applicable worker secret environments:

```dotenv
RYVIX_MODEL_PROVIDER=gemini
RYVIX_MODEL_FALLBACK_ORDER=gemini,groq
GEMINI_MODEL=gemini-3.5-flash
GROQ_MODEL=openai/gpt-oss-120b
GEMINI_API_KEY=<replacement secret>
GROQ_API_KEY=<replacement secret>
```

Leave RYVIX_CHAT_PROVIDER unset or set it to gemini. These placeholders must be
replaced before use. Restart services after changing settings. Do not use
NEXT_PUBLIC variables for credentials. An empty fallback order retains the
existing single-provider behavior. Invalid, duplicate or conflicting selections
fail configuration validation. Worker startup requires every listed credential.

## Behavior and boundaries

- Only providers in the ordered list are tried; each has an explicit model.
- Chat and coding resend the same caller-supplied messages to the backup, with
  attempt/usage reporting. No cross-provider hidden memory transfer occurs.
- Requests have a 45-second per-attempt deadline within the existing 120-second
  request deadline. Cancellation stops fallback.
- HTTP 429 places the provider in a process-local cooldown of at least 60 seconds,
  respecting longer Retry-After values for Gemini/Groq compatible requests.
  Cooldowns are not shared across replicas or persisted through restarts.
- Pre-output provider errors can fall through to the approved backup, including
  credential errors (recorded as failed attempts; credentials must still be fixed).
- After any streamed text has been emitted, errors stop the stream; the system
  does not concatenate another provider's response. The user must retry.
- Compatible nonstream completions reject empty or output-truncated answers
  before any caller can apply them. Exhausted chains fail visibly, not with a
  deterministic answer. Existing task failure/retry behavior is unchanged: this
  change does not add durable automatic resumption or a waiting-for-quota queue.
- Context must fit the selected models. Automatic context summarization and
  same-provider model ladders are not implemented by this change. Choose a
  backup that supports the workload; oversize context can fail both providers.
- Provider calls can consume paid usage if the account has billing enabled.
  Set provider-side quotas/budgets. Fallback does not grant extra quota.

## Verification and activation

Offline tests cover Gemini 429 -> Groq completion/streaming, identical context,
attempt accounting, all providers failing, invalid ordering and no mixed partial
streams. Existing single-provider tests continue to pass.

October 8 verification: workspace typecheck passed; offline npm test passed
97 application suites and 36 Node tests. The offline wrapper restored twelve
AI data files byte-for-byte. Secret scan found zero findings. Live provider probes
were subsequently performed as recorded above. No deployment, commit or push
was performed.

For each provider, set RYVIX_MODEL_PROVIDER to that provider and run
`npm run verify:model -- --live` with protected credentials loaded. The probe
disables fallback in its own process so a backup cannot hide a failed provider.
Restore gemini as primary afterwards. Then test configured fallback and real
chat/coding on the final deployment. Never exhaust real quotas deliberately to
test switching; use the offline injected failures for that scenario.
