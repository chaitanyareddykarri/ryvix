# ADR-021: Reviewed tenant learning examples

Learning data belongs to a project. Operators submit examples with provenance;
owners/admins review them. Training, validation and test partitions are assigned
when submitted and immutable. Identical feature payloads cannot cross partitions.
User assertions of real/unseen provenance require human review; the system cannot
infer that a supplied dataset is representative. Historical global JSON patterns
are never imported automatically.

All state changes use membership locks and append project audits. Browser SQL
writes are revoked. External model answers and task success do not automatically
become labels. This phase creates the review boundary; it does not declare a
classifier production-ready or silently activate newly trained weights.
