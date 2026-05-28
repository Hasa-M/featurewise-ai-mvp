# ADR-003: Model core hierarchy as Organization → Project → Feature → SpecRun → GeneratedSpec

Date: 2026-05-26

Status: accepted

## Context

The backend needs a clear product domain model that supports the MVP workflow this must be the single stream that defines the core value of the v0 product idea.

The product work happens around features, but features need to live inside a project and organization context.

## Decision

The phase 1 core hierarchy will be:

```
Organization
  → Project
    → Feature
      → SpecRun
        → GeneratedSpec
```

`Organization` and `Project` are lightweight containers.

`Feature` is the main product object.

`SpecRun` represents one generation info.

`GeneratedSpec` stores the actual generated output - the result.

## Consequences

This gives the backend a clear domain structure and avoids treating the product as a single prompt/response tool, making understanding the core product flow easier.

It also introduces more structure than the absolute minimum, so we must keep each entity small in phase 1.