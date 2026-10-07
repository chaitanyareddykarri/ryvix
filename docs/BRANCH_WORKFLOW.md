# Main and testing workflow

`main` is the production release branch. `Testing_branch` is the shared integration
branch: push changes there, review CI and browser results, then open a pull
request from `Testing_branch` to `main`. After promotion, synchronize `Testing_branch` with
`main`. Do not force-push either branch.

CI runs on pushes and pull requests targeting either branch, using Node 22,
typecheck, secret scanning, lint, offline tests, browser fixtures and builds.
The production workflow accepts successful CI for pushes to `main` only and
still requires `RYVIX_DEPLOY_ENABLED=true`, configured settings and the existing
production environment. Passing local/CI tests does not establish live readiness.

The old remediation branch is already included in main's history. The divergent
mobile UI branch has unique commits; retain its tip under the immutable
`archive/mobile-responsive-ui-2026-10-07` tag before removing that branch.
This preserves its work without replacing the newer reviewed local dashboard.

Source, tests, migrations, lockfiles and documentation belong in Git. Secrets,
temporary/build artifacts and existing generated AI runtime data remain local;
they are not production configuration or reviewed training checkpoints.

Repository rules requiring reviewed pull requests and successful checks should
be enabled in GitHub before team use. Workflow files alone do not prevent direct
pushes; this update does not claim remote branch protection is configured.
