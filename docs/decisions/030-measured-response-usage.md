# ADR 030: successful-response usage and configured cost estimates

Persist usage reported by completed provider streams on the existing tenant-scoped
chat/WhatsApp records. Missing values stay null. Do not derive tokens from text
length or label a configured-rate calculation as invoiced cost. Preserve separate
cache categories and cumulative Anthropic output semantics. Failed/interrupted
attempts and external tool charges are not covered by this successful-response
measurement, so it is not a complete billing ledger or invoice reconciliation.

Migration 20261003000005 adds bounded JSON objects without broadening existing
browser permissions. Rate configuration is operator-controlled, versioned and
exact-provider/model keyed. Missing rates produce no currency estimate.

Protocol references: [Groq API](https://console.groq.com/docs/api-reference) and
[Anthropic streaming](https://platform.claude.com/docs/en/build-with-claude/streaming).
