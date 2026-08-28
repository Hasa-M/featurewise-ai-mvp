# ADR-0004: Support only new_feature and feature_update

Date: 2026-06-13

Status: superseded

Superseded by: ADR-0020, which is itself superseded by
[ADR-0030](ADR-0030-specification-analysis-core-domain.md)

> Historical record only. Feature has no type or origin discriminator under
> the current specification-analysis domain.

## Context

Features may have many possible types.

For the MVP, supporting and searching many feature types would increase product and backend complexity before the core workflow is validated - so it doesn’t take for sure any advantage.

## Decision

Phase 1 will support only two feature types:

```
new_feature
feature_update
```

Other feature types are deferred.

## Consequences

This keeps the MVP focused and easier to understand.

Some real-world cases may not fit perfectly yet, but they can be handled later once the core workflow is working.
