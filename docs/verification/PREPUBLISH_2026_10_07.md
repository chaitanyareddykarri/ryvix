# Pre-publish cross-check - October 7, 2026

The repeated dashboard report was correct: a secondary approval checklist still
claimed four files on main, automatic tests and zero-downtime edge deployment.
Removed those claims. Approval describes GitHub PR creation and conditional
repository CI/release workflows. Also removed fabricated preview commit IDs and
fallback successful analysis/build labels; file counts come from recorded task
results and unrecorded evidence stays unavailable. A browser test verifies the
display and that only explicit approval submits the selected task.

Fresh runtime readiness inspection exits 1 because cloud-model, preview domain,
preview signing, agent release, worker image/allowlist/host/routing configuration
is absent locally. Database verified-TLS inspection passes with no missing
migrations. WhatsApp app/webhook/OTP/template/version settings are also missing;
business connector credentials belong in the existing tenant Vault integration,
not a new hardcoded global token. No secrets were fabricated or provider calls sent.

Fresh npm audit additionally found vulnerable `sharp`; the lockfile was updated
within Next's supported dependency range. Five development-chain findings remain
through Next ESLint, fast-glob, micromatch and braces. The registry still lists
braces 3.0.3 and the [upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
lists no patched version. No forced Next downgrade or audit suppression was used.

CI now includes `Testing_branch`, Node 22, offline tests and browser fixtures. Production
CD is explicitly limited to successful push builds on `main`; pull-request runs
cannot trigger release. See [branch workflow](../BRANCH_WORKFLOW.md).

## Validation and publication preparation

- Offline tests: 97 application suites and 25 Node tests passed; twelve AI runtime
  files restored byte-for-byte.
- Full browser fixture suite: 186 passed, including the approval regression.
- Typecheck, lint and isolated production workspace build passed.
- Production npm audit: zero vulnerabilities; full audit: five high development
  findings remain as described above.
- Secret regression scan: zero findings. Local links across 181 Markdown files
  resolved; Git whitespace verification passed.
- The user removed old remote branches and created `Testing_branch`. CI uses that
  exact branch name. An archive tag preserves the former unique mobile branch tip.
- Existing AI runtime data is backed up locally and excluded from the source
  commit, along with ignored secrets/build/temporary artifacts.

Final staged review retained database keep-alive but removed a concurrent generic
SQL retry: a disconnect can occur after a mutation commits. A new regression
checks no replay after ECONNRESET/EPIPE/ETIMEDOUT and preserves verified TLS.
The final offline suite passed with 25 Node tests plus 97 application suites.
