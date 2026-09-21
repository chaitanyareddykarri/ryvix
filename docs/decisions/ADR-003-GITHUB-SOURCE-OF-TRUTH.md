# ADR-003: GitHub as Authoritative Source of Truth & Preserving Customer CI/CD

## Context
When Ryvix modifies customer software, questions arise regarding where code should be stored, how releases are triggered, and whether Ryvix should provide its own deployment runner to replace tools like GitHub Actions, Vercel, or ArgoCD.

## Decision
1. **GitHub is the Authoritative Source of Truth**: All permanent code modifications must be committed to GitHub repositories via feature branches or Pull Requests.
2. **Preserve Customer CI/CD**: Ryvix explicitly integrates with existing customer build and deployment workflows rather than replacing them. After Ryvix commits verified code, the customer's CI/CD builds and deploys to production, after which Ryvix performs post-deployment runtime verification.

## Consequences
- **Positive**: Zero vendor lock-in for the customer; seamless integration with established team workflows, branch protections, and compliance checks.
- **Negative**: Ryvix must listen asynchronously to external CI/CD webhooks or poll deployment statuses rather than executing deployment directly.

## Alternatives Considered
- **Ryvix Internal Git Hosting**: Rejected because developers already collaborate on GitHub, and hosting repositories internally creates unnecessary synchronization complexity.
- **Replacing Customer CI/CD with Ryvix Deployment Engine**: Rejected because customers have complex custom deployment logic that would introduce immense migration friction.
