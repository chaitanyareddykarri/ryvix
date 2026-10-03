# Pending work after the October 3 workspace audit

This is the active remediation queue. The [audit](verification/WORKSPACE_AUDIT_2026_10_03.md)
preserves the original findings; [project status](PROJECT_STATUS.md) describes implemented workflows.

| Order | Work | Status |
| --- | --- | --- |
| 1 | Prevent the experimental simulator from approving compound/destructive commands; correct its safety claims | Fixed; regression checks passed |
| 2 | Remove false-success HTTP handling from the legacy integration test; explicitly separate fixtures and optional live checks | Fixed; regression checks passed |
| 3 | Return unavailable metrics for empty DPO evaluation | Fixed; regression checks passed |
| 4 | Resolve development dependency advisory compatibly and rerun checks | Pending |
| 5 | Separate legacy synthetic weights from reviewed checkpoint deployment | Pending |
| 6 | Audit consumers before removing/quarantining global JSON memory, seeded topology and experimental brain exports | Pending |
| 7 | Improve coding context/repair coverage and add authenticated acceptance scenarios | Pending |
| 8 | Decide and implement scheduled Gmail intake; Gmail push/replies are separate missing features | Pending |
| 9 | Configure real workers, images, DNS/TLS, existing LLM credentials, SMTP, Meta and agent release | Needs deployment configuration |
| 10 | Verify real delivery, browser flows, coding-to-release, approved recovery and multi-host operation | Needs deployed test targets/accounts |
| 11 | Collect independently reviewed evidence, evaluate held-out quality and monitor drift | Needs representative data/reviewers |

No human-brain capability, universal self-learning or live-provider certification is claimed.
Existing dirty AI runtime files must remain outside source commits.

Items 1–3: [changes and verification](verification/AUDIT_REMEDIATION_2026_10_03.md).
For item 4, registry inspection still lists braces 3.0.3 as latest, within the
reported advisory range. A normal version bump is not an established fix; assess
replacement/removal or an upstream patch without blindly downgrading Next tooling.
