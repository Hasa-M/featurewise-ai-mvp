# ADR-0030: Make Specification Analysis the Core Product Domain

Date: 2026-08-28

Status: accepted

Supersedes: ADR-0003, ADR-0006, ADR-0018, ADR-0020, ADR-0021

## Context

The original MVP architecture treated a generated, versioned specification as
Featurewise's canonical output. That model introduced `FeatureOrigin`, nested
`FeatureUpdate` targets, `SpecRun`, `GeneratedSpec`, validation, consolidation,
and computed alignment before the product had proved that generating and
maintaining a document was its differentiated value.

Featurewise's product value is instead the analysis of user-authored software
feature intent. It must find expensive ambiguity, inconsistency, missing
information, unresolved decisions, testability gaps, and context conflicts
before implementation starts.

That analysis may use requirements, acceptance criteria, product and technical
documentation, designs, prior decisions and analysis history, current product
behavior, source code, technical constraints, business/domain rules, and
organization-specific standards or policies. No one context type defines the
product.

## Decision

Featurewise is a **Specification Analysis Engine for software product
development**. The engine is the product. The **Featurewise Console** is its
first-party control plane and client, not a separate source of business logic.

The sole analysis unit is a `Feature`. A Feature contains a user-authored
software feature specification and supporting context. Whether the feature is
new or already exists belongs in that specification or context; it is not a
domain discriminator. `FeatureOrigin` and `FeatureUpdate` are removed.

Business rules, policies, code, requirements, designs, and history are generic
context/evidence inputs. They do not create separate product centers, domain
entities, or bespoke analysis pipelines unless later evaluation proves a
specialized capability is necessary. Featurewise remains neutral to the
customer's systems of record and is not a policy engine, business-rules
platform, requirements-management system of record, or enterprise governance
suite.

One analysis execution is an `AnalysisRun`. Its primary output is zero or more
individually addressable, evidence-backed `AnalysisFinding` records. A finding
describes the issue, why it matters, its evidence, and possible resolutions.
The engine is explicitly allowed to return zero findings.

Findings may include severity and useful verification metadata. Confidence is
included only when evaluation demonstrates that it is calibrated and useful;
it is not an unconditional MVP guarantee.

Human decisions are separate append-only `FindingReview` records. Accepting,
dismissing, resolving, or deferring a finding never mutates the model assertion
that produced it.

`SpecRun`, `GeneratedSpec`, generated-spec validity and versioning,
consolidation, incorporated updates, and alignment are removed. Featurewise
does not generate or maintain the canonical feature specification.

The MVP remains a local-first NestJS modular monolith with a React Console,
PostgreSQL, and private S3 object storage. The analysis capability must remain
adapter-neutral so future HTTP, CLI, MCP, integration, or embedded clients call
the same application boundary. No additional adapter is part of this decision.

The implementation follows this model. Superseded names remain only in
historical ADRs and migrations that preserve their original decisions and
schema history.

## Consequences

- Product work centers on finding quality, evidence grounding, verification,
  and evaluation rather than generated-document management.
- Organization and Project remain lightweight ownership/context boundaries;
  Feature remains the main product entity and sole analysis target.
- The Console exposes Specification, Context, and Analyses surfaces.
- Analysis findings and human review history require relational persistence.
- Generated-spec schema, API, projection, and UI concepts are removed from the
  current product model.
- Analyzer prompts, provider choice, retries, verification behavior, and the
  evaluation harness remain deferred decisions.
