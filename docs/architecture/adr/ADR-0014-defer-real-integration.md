# ADR-0014: Defer Real Integrations, Worker, and Dedicated AI Service

Date: 2026-06-02

Status: accepted

Amended by: [ADR-0030](ADR-0030-specification-analysis-core-domain.md),
[ADR-0031](ADR-0031-feature-specifications-and-traceable-analysis-inputs.md),
[ADR-0032](ADR-0032-analysis-application-boundary-and-lifecycle.md)

> Integrations, a queue, a worker, and a dedicated AI service remain deferred.
> Future integrations are neutral context or client adapters over the analysis
> boundary; the old generation workflow below is historical product context.

## Context

As specified in ADR-006 Featurewise may later integrate with systems such as Figma, GitHub, Jira, Linear, Notion, Cursor rules, Claude project files, or dedicated AI/coding-agent workflows.

The backend may also later split generation into a worker or dedicated AI service, possibly implemented in FastAPI.

For phase 1, these additions would increase scope and delay the MVP.

## Decision

Phase 1 will not include real third-party product integrations, a separate worker, a queue, or a dedicated AI service.

External systems may appear in diagrams only as deferred/future systems.

In phase 1, context from external tools is represented through uploaded or pasted artifacts handled by the backend Context Intake module.

## Consequences

- The MVP remains focused on the core workflow: project, feature, context, spec generation, review/edit, and Markdown export.
- Future integrations can be introduced later as adapters.
- The backend should keep clear module boundaries so future extraction is possible.
- The product does not pretend to have integrations that are not actually implemented.
