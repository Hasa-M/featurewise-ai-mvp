# ADR-004: Support only new_feature and feature_update

Date: 2026-05-26

Status: acceppted

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