# ADR-0035: Establish the analysis-input V0 workstream constraints

Date: 2026-09-10

Status: accepted (initial scope and constraints only; data contract undecided)

Amends: ADR-0030 through ADR-0034 for analysis-input contract consolidation
and retention of superseded context documentation.

## Context

Featurewise is an unused pre-alpha prototype. No existing application data or
context contract requires backward compatibility. The development harness
exposes captured inputs, but prepared context and the final provider request
are not implemented. Existing V1/V2 contracts must not constrain the design of
the first complete data preparation boundary.

## Decision

- The workstream must make acquired data, formatting, normalization, and the
  resulting content intended for the LLM inspectable and testable before
  prompt engineering or analyzer engineering begins.
- Define the complete data structure together with the product owner in
  subsequent work. This ADR specifies no fields, schemas, format handling,
  segmentation rules, or normalization algorithms.
- The agreed structure becomes the sole current **V0** baseline. Replace the
  previous context/input contract variants; do not retain V1/V2 readers,
  compatibility adapters, parallel schemas, or legacy-only tests and fixtures.
- At workstream completion, code, contracts, tests, harness, diagrams, and
  documentation must describe the same V0 baseline. Remove superseded context
  definitions and historical explanations from the maintained repository
  documents, including ADRs and contract documents. Do not move them into an
  archive or retain them as historical appendices. Preserve still-applicable
  decisions by expressing them as current rules.
- This consolidation overrides earlier requirements to preserve superseded
  context documentation or V1/V2 semantics. It does not require rewriting Git
  history or performing a database/storage reset in this initial change.
- Retain provenance, exact source identities, checksums, and reproducibility.
  A single contract baseline does not remove immutable snapshot or S3 object
  identity guarantees. It does not decide future prompt or output versioning.
- Use the existing harness to verify the future preparation boundary without
  model calls. Distinguish inspected data intended for the model from a full
  provider request, which remains dependent on later adapter decisions.
- Prompt design, provider selection, analyzer execution, database engineering,
  RAG/retrieval, and new analysis HTTP endpoints are outside this workstream.

## Consequences

These constraints govern subsequent work on `feat/analysis-input-v0` and its
completion review. The initial change records this decision only; it neither
defines V0 nor implements preparation or performs the legacy cleanup.

Completion requires an agreed V0 definition, inspectable preparation results,
tests demonstrating repeatability, traceability, and visible exclusions or
losses, and removal of superseded context variants and documentation. Existing
architectural guarantees remain applicable except for the explicit
compatibility and documentation-retention amendments above.
