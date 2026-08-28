# ADR-0003: Model core hierarchy as Organization → Project → Feature → SpecRun → GeneratedSpec

Date: 2026-06-13

Status: superseded

Superseded by: [ADR-0030](ADR-0030-specification-analysis-core-domain.md)

> Historical record only. The current hierarchy centers on Feature analysis,
> findings, and reviews; the hierarchy below must not guide new implementation.
> ADR-0030 is authoritative.

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

> **Amended by ADR-0020.** `FeatureUpdate` is inserted as a child of `Feature`
> (0..N, exactly one nesting level), and `SpecRun`/`GeneratedSpec` become
> target-polymorphic. Updated hierarchy:
>
> ```
> Organization
>   → Project
>     → Feature                    (main product object)
>       → FeatureUpdate (0..N)     (an increment inside a Feature)
>
> SpecRun → GeneratedSpec          target = a Feature OR one of its FeatureUpdates
> ```
>
> `featureId` is always set on a run/spec (the scope); `featureUpdateId` is set
> only when the target is an update.

`Organization` and `Project` are lightweight containers.

`Feature` is the main product object.

`SpecRun` represents one generation info.

`GeneratedSpec` stores the actual generated output - the result.

## Consequences

This gives the backend a clear domain structure and avoids treating the product as a single prompt/response tool, making understanding the core product flow easier.

It also introduces more structure than the absolute minimum, so we must keep each entity small in phase 1.
