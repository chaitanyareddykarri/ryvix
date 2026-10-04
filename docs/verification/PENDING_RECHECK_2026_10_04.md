# Recheck of the nine reported pending items

| # | Report | Verified result |
| --- | --- | --- |
| 1 | Missing viewport breaks mobile rendering | Incorrect: installed Next.js already emits `width=device-width, initial-scale=1`, confirmed in built HTML. Root layout now explicitly exports the same settings without restricting zoom. |
| 2 | Workspace image variables | Still missing from normal local runtime sources. Requires real published images and deployment allowlist; values cannot be invented. |
| 3 | Preview DNS/TLS/signing | Local domain/signing/public URL configuration remains absent. DNS/TLS requires the chosen deployment; generating a secret alone does not deploy previews. |
| 4 | Live clone-to-PR coding test | Still pending deployed Linux/Docker workers, approved images, reachable previews, provider credentials and authorized test repository. Existing fixture tests are not live acceptance. |
| 5 | WhatsApp setup | Code exists. Requires real Meta configuration, connected business account, recipient opt-in/template setup, enabled workers and real receipt verification; it is more than setting one environment variable. |
| 6 | No accuracy gate because readiness manager is in memory | Stale diagnosis: `reviewed-training.ts` requires reviewed partitions and validation/test accuracy and macro recall >= 0.8, with no accuracy regression against the baseline. `LearningStore.promote` requires an eligible persisted checkpoint and still-approved samples. Real representative evidence and measured quality remain pending; the legacy in-memory readiness helper is not this promotion path. |
| 7 | Servers mobile navigation overflow | Fixed: wrapping semantic navigation/title/filter rows, breakable long identity text and cards whose minimum width fits the container. |
| 8 | Public GitHub webhook delivery | Still needs deployed public endpoint, configured GitHub webhook and real delivery/reconciliation evidence. |
| 9 | Hardcoded latency 45 | Stale: finite nonnegative observed latencies are averaged; absent measurements return null. Existing tests verify 120ms + 80ms averages to 100ms and missing values remain unknown. |

Local Chrome rendering used the actual servers component and stylesheet with explicit
fixture state, including long email/hostname strings. At 320, 375, 390 and 768px, the
old layout overflowed to 1120px; the updated document width matched each viewport.
This validates layout, not an authenticated deployed server workflow. No real server
data or credentials were used in the browser fixture.

The read-only runtime probe confirmed verified-TLS database access and no missing
migrations. Missing local LLM keys/settings do not prove absence from a remote secret
store. Existing dirty runtime data and Next configuration were preserved.

Verification: typecheck, lint and full production build passed. Full tests passed
85 project suites plus 15 Node checks; runtime files were restored with matching
hashes. A read-only count confirmed zero reviewed-learning examples, checkpoints
and deployments, so no trained classifier quality is claimed.

Framework reference: [Next.js viewport defaults](https://nextjs.org/docs/app/api-reference/functions/generate-viewport).
