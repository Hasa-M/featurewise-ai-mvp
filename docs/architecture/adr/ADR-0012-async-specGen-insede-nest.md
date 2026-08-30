# ADR-0012: Run Asynchronous Spec Generation Inside the NestJS Process in Phase 1

Date: 2026-06-02

Status: superseded

Superseded by:
[ADR-0032](ADR-0032-analysis-application-boundary-and-lifecycle.md)

> Historical record only. ADR-0032 retains asynchronous in-process execution
> for the MVP but replaces spec generation with the analysis lifecycle.

## Context

Spec generation can take time because the backend must collect context, normalize it, call the LLM provider, validate the response, run quality checks, and persist the result.

The user experience should show generation progress/status instead of blocking the UI as if generation were instant.

However, introducing a queue and separate worker would add infrastructure and deployment complexity too early.

## Decision

Spec generation will be asynchronous from the user’s perspective, but executed inside the NestJS backend process in phase 1.

The backend creates a `SpecRun`, stores its status, starts generation, updates the status during execution, and persists the generated spec or failure result.

The frontend polls the backend for generation status.

No separate worker, queue, or FastAPI AI service is included in phase 1.

## Consequences

- The user experience can support a clear generation status flow.
- The architecture remains simple enough for the MVP.
- The backend code should be structured so generation can later move to a worker or dedicated AI service.
- Phase 1 does not support multiple concurrent generations as a core requirement.
- Long-running generation is less robust than a queue-based architecture, but acceptable for the prototype.
