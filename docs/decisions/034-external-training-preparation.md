# ADR 034: Separate reviewed examples for external LLM training

Classifier labels, runtime JSON and chat history are not external LLM training
datasets. A separate project-scoped table accepts explicit question/answer pairs,
provenance, evidence groups, partition and external-training consent. Owner/admin
submission and independent owner/admin review are mandatory. Project locking
serializes duplicate and evidence-group partition checks. Current author/reviewer
membership is checked again at export; revocation excludes an example.

The authenticated `/api/learning/external` API supports list, submit, review,
revoke and export. Exports require 20 train, 5 validation and 5 test examples,
carry example IDs and a dataset hash, and separate test JSONL from training JSONL.
These minimums are preparation gates, not evidence of representative quality.
Exports are provider-neutral; named provider/model fields are metadata, not a claim
that the provider accepts the format or model. No provider job is submitted and no
model is activated. Paid job approval, provider adapter, held-out evaluation and
promotion/rollback remain follow-up work after provider/model selection.

Migration `20261004000002` is backend-only with RLS and no browser table grants.
