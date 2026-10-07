# 039: Persist repository display URLs

Store an optional `repositories.live_url` for cross-device dashboard comparison.
Only current tenant operators may change it, under a locked membership and an
atomic audit transaction. Reads require current tenant membership. Accept only
HTTP(S) URLs without embedded credentials; do not fetch them server-side or treat
them as health evidence. Removing the value is explicit. Browser caches are not
authoritative and are not silently migrated across users or organizations.

The incremental migration was applied on October 7, 2026; see the
[rollout record](../verification/MIGRATIONS_2026_10_07.md).
