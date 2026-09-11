# Architecture Documentation

This folder defines the current architecture for the local-first Featurewise
MVP. Historical ADRs and migrations intentionally retain superseded
terminology; the accepted ADRs below are authoritative for the implemented
product baseline and separately scoped future analysis work.

[ADR-0035](adr/ADR-0035-analysis-input-v0-initial-decisions.md) sets the accepted
constraints for the analysis-input V0 workstream. Its completion requires one
current context contract and removal of superseded context documentation,
overriding the historical-retention statements below for that scope. The V0
structure itself remains undecided.

## Current product-domain decisions

- [ADR-0030](adr/ADR-0030-specification-analysis-core-domain.md) makes
  specification analysis the core product domain and defines the
  engine/Console boundary.
- [ADR-0031](adr/ADR-0031-feature-specifications-and-traceable-analysis-inputs.md)
  defines feature specifications, editable context, immutable analysis inputs,
  and evidence identity.
- [ADR-0032](adr/ADR-0032-analysis-application-boundary-and-lifecycle.md)
  defines the analysis application boundary and run lifecycle while deferring
  the analyzer implementation and HTTP execution endpoints.
- [ADR-0033](adr/ADR-0033-github-repository-context.md) authorizes the GitHub
  App repository-context adapter, defines `repository_revision`, and keeps all
  other third-party context integrations deferred.

## MVP completion and product direction

[ADR-0036](adr/ADR-0036-product-direction-and-inference-sources.md) records the
accepted next objective: complete the Console analysis path using one model
configuration managed and funded by Featurewise.

It also records the future cloud engine, shared clients and authorized data,
and customer API, subscription, and local/private inference directions.
Those integrations and their technical designs remain deferred. This is a
product direction and a narrow clarification of ADR-0032's initial inference
provisioning; the current architecture and local-first scope remain valid.

## Preserved architecture and context boundaries

Relevant context may include requirements, designs, product history, current
behavior, source code, technical constraints, business/domain rules, and
organization policies. These are generic context/evidence inputs rather than
separate product domains or bespoke analysis pipelines. In the MVP they enter
through specifications, editable context, uploaded/pasted artifacts, or the
single authorized GitHub repository adapter. Other dedicated source adapters
remain deferred.

Historical ADRs remain in `adr/`. Superseded records are preserved for
rationale but are marked at the top and must not guide new implementation.
Accepted ADRs amended by ADR-0030 through ADR-0032 retain their still-valid
technology or lifecycle decisions with a current-rule notice.

Important preserved decisions include the NestJS modular monolith (ADR-0002),
trunk-based development (ADR-0008), React/Vite Console (ADR-0009), local-first
scope (ADR-0010), private S3 storage (ADR-0011 and ADR-0029), minimal auth
(ADR-0015), frontend layering (ADR-0022 through ADR-0026), and public API
identifiers (ADR-0028).

Repository content remains an external source and is never converted into a
`StorageObject`. The temporary v1 preparation policy is filtered manifest plus
root allowlist plus all Feature-selected files. Retrieval, vector indexes, and
AI-generated internal documentation require separate decisions and evals.

Operational documentation:

- [Local GitHub App setup](../integrations/github-app-local-development.md)
- [GitHub data handling](../github-data-handling.md)
- [Development harness](../testing/development-harness.md)
- [Integration strategy and future preparation tests](../testing/integration-strategy.md)
- [ADR-0034: inspectable development harness](adr/ADR-0034-inspectable-development-harness.md)

## Diagrams

- [System context](diagrams/01-c4-system-context/README.md)
- [Container architecture](diagrams/02-c4-container/README.md)
- [Target domain ERD](diagrams/03-erd-core-mvp/entity-relation-diagram.md)
- [Analysis lifecycle](diagrams/04-sequence-analysis-lifecycle/sequence-diagram.md)
- [Console navigation](diagrams/05-c4-frontend-navigation/README.md)

## Deferred contracts

- [Analysis HTTP adapter](contracts/deferred-analysis-http-api.md) documents
  the provisional, explicitly unimplemented REST boundary reserved for the
  future real analyzer vertical slice.

The C4 diagrams use Mermaid so their source is reviewable with the rest of the
architecture.
