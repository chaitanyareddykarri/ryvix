# Remaining implementation plan — October 5

1. Replace stale disabled server controls with explicit approval-page handoffs.
   Preselect only servers/services returned by authorized APIs; never submit on navigation.
2. Resolve the development dependency advisory with a compatible supported fix.
   October 5 registry/advisory inspection still finds no patched braces release;
   latest Next lint plugin still depends on the affected chain. Do not suppress the
   audit or remove lint checks just to obtain a green result.
3. Expand repository analysis: prioritize parser-backed JS/TS references and local
   aliases, then language-specific resolvers and measured retrieval evaluation.
   Preserve bounded files, tenant isolation and immutable snapshot identity.
4. Record each LLM provider attempt, including failures/fallbacks and reported
   usage. Unknown usage stays unknown. Invoice reconciliation remains separate.
5. Add verified transport status handling: Twilio signed delivery callbacks and
   PagerDuty incident reconciliation. Slack API acceptance must not be labeled read.
6. Add external-training job lifecycle only after provider/model selection, with
   approved dataset hashes, explicit budget/job approval, independent review,
   held-out evaluation, promotion and rollback. Never submit a paid job implicitly.
7. Run relevant regression/SQL checks and update implementation status after each
   phase. Real accounts, reviewed evidence and deployed targets are final acceptance
   prerequisites, not substitutes for unfinished code.

Provider/model clarification is pending. Work independent of that answer continues.
No universal language support or human-brain/self-learning capability is promised.

## Implementation checkpoint

Steps 1, 4 (streaming channels), and 5 are implemented and locally tested. Step 3
now includes JS/TS syntax parsing and bounded local aliases; broader language and
compiler resolution remains open. Step 2 remains blocked by the unresolved
development toolchain advisory. Step 6 awaits provider/model selection; dataset
review/export already exists, but provider job execution is not implemented.
See [evidence and exact boundaries](verification/FOLLOWUP_2026_10_05.md).
