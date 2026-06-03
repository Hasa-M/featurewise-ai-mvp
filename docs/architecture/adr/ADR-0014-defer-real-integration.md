# ADR-014: Defer Real Integrations, Worker, and Dedicated AI Service

Date: 2026-06-02

Status: accepted

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