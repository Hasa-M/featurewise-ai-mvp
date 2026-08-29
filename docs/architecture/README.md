# Architecture Documentation

This folder defines the accepted target architecture for the local-first
Featurewise MVP. Runtime migration is phased; where code still uses historical
generated-spec terminology, the accepted ADRs below are authoritative.

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

Relevant context may include requirements, designs, product history, current
behavior, source code, technical constraints, business/domain rules, and
organization policies. These are generic context/evidence inputs rather than
separate product domains or bespoke analysis pipelines. In the MVP they enter
through specifications, editable context, or uploaded/pasted artifacts;
dedicated source adapters remain deferred.

Historical ADRs remain in `adr/`. Superseded records are preserved for
rationale but are marked at the top and must not guide new implementation.
Accepted ADRs amended by ADR-0030 through ADR-0032 retain their still-valid
technology or lifecycle decisions with a current-rule notice.

Important preserved decisions include the NestJS modular monolith (ADR-0002),
trunk-based development (ADR-0008), React/Vite Console (ADR-0009), local-first
scope (ADR-0010), private S3 storage (ADR-0011 and ADR-0029), minimal auth
(ADR-0015), frontend layering (ADR-0022 through ADR-0026), and public API
identifiers (ADR-0028).

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
architecture. The
[refactor plan](specification-analysis-refactor-plan.md) records which target
decisions have reached the runtime implementation.
