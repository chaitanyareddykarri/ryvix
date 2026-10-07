# UI/backend connectivity audit and first repair phase

> Historical checkpoint: later implementation and applied-migration status are
> recorded in [current status](../PROJECT_STATUS.md), [pending work](../PENDING_WORK.md)
> and the [October 7 rollout](MIGRATIONS_2026_10_07.md). Original findings and test
> results below describe this report's checkpoint, not the current pending queue.

Checked the eight supplied claims against current source, after phone onboarding.
No real providers, live database writes, commits or pushes were used.

| Claim | Current finding |
| --- | --- |
| 1. Profile phone and dashboard prompt missing | Stale: contact API/form, recurring dashboard modal, profile link and shared OTP controls are implemented. See phone onboarding evidence. |
| 2. Repository analysis never called or displayed | Incorrect: ConnectRepositoryModal calls `/api/github/repositories/analyze` and displays analysis in its connected summary. A persistent detailed repository-inspection view could still be improved. |
| 3. SSH generation/access diagnosis UI missing | Confirmed. Backend is not fully ready: generated public key is base64 of PEM truncated to 68 characters, not SSH wire format. Diagnostics include an unrestricted sudo suggestion. Correct and verify before adding controls. |
| 4. Archetype classifier UI missing | Confirmed. Existing endpoint classifies submitted hints with deterministic heuristics; it is not an authenticated live server inspection or measured accuracy guarantee. |
| 5. Key revocation UI missing | Confirmed, and the mutation API was also missing. Added scoped, audited revocation and explicit dashboard confirmation in this phase. |
| 6. Team management UI missing | Confirmed; invite/role/removal mutation workflows are also absent. Membership tables alone do not provide an invitation lifecycle. |
| 7. Dashboard deployment tab is a stub | Confirmed; replaced with recorded runtime mappings/observations, visible failure/empty/loading states, refresh, and links to mapping management and release approvals. |
| 8. Operational pages disconnected and unstyled | Dashboard discovery gap confirmed, although some pages were linked from Chat/Servers/Channels and already had basic styling. Added a dashboard Workspace tools menu and a shared navigation/layout across the operational pages. |

## Implemented first phase

- All ten listed destinations are reachable from Dashboard > Workspace tools.
  Deployments, Servers and Channels are also included. Menu fits narrow phones.
- Shared layouts for releases, operations, recovery, notifications, knowledge,
  experience, learning (including external exports), profile, usage and deployments.
  Existing workflows are retained; common controls/navigation receive consistent styling.
- Dashboard deployment data comes from `/api/deployments/runtime`; missing
  observations remain unknown. Merely opening the tab starts no endpoint probe.
- `SettingsStore.revoke_key` checks owner/admin membership under lock, scopes
  the update to the current organization and active key, and commits revocation
  with its organization audit event. Missing/already-revoked keys fail visibly.
- Dashboard key revocation asks for confirmation. A denied/failed request retains
  the row. Key generation failures now display an error rather than only logging it.
- Settings GET exposes the current verified role for UI availability; backend
  authorization remains authoritative.

## Pending phases

1. Server tools: fix SSH key serialization and diagnostic guidance, validate/bound
   submitted fields, prevent caching private-key responses, then add explicit key
   generation/access-diagnosis controls. No automatic server changes.
2. Classifier: expose results based on authorized measured inventory where available;
   clearly distinguish manually supplied hints and heuristic recommendations.
3. Team lifecycle: invitations/acceptance/expiry and delivery adapter, role changes,
   member removal, organization audit, no self-escalation and last-owner safeguards.
   Review connector ownership and existing approvals when membership is revoked.
4. API-key authentication: no hash-verification consumer was found in the inspected
   web/backend source. Creation/revocation of records does not establish a working
   public API credential path; define intended endpoints/scopes and implement it.
5. Additional populated-page UX and real Next navigation/hydration acceptance;
   live provider, database and physical-phone acceptance remain separate.

## Verification

- Four new browser workflows passed: mobile destination discovery, deployment
  recorded/unknown states, deployment denial and confirmed/denied key revocation.
- Offline: 87 application suites plus 24 Node tests passed; 12 runtime files restored.
- Settings regressions cover denied role, organization-scoped revoke, missing key
  and audit/rollback behavior. Typecheck passed.
- Full browser run: 149 passed, three old keyboard-order assertions failed because
  the shared navigation now precedes Chat. Updated those assertions to verify
  Dashboard -> Workspace tools -> Chat; all three passed on targeted rerun.
- Production build (including framework lint/type validation) passed. Secret scan:
  zero findings. The additional revocation audit-failure rollback regression passed.

Earlier suspended work remains in [the local checkpoint](LOCAL_CHECKPOINT_2026_10_06.md).
