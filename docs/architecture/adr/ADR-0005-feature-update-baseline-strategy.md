# ADR-005: Define baseline strategy for feature updates

Date: 2026-05-26

Status: proposed

## Context

Trivially, a feature update cannot be analyzed properly without understanding the current state of the existing feature.

Some existing features may already be mapped inside the system, while others may exist only externally in the real product.

## Decision

For `feature_update`, the system must know the baseline of the existing feature.

The baseline can come from:

```
mapped_in_system
not_mapped_yet / external_baseline
```

If the feature is not mapped yet, the user must provide current-state context before generating the update spec and not treat is as a new feature.

## Consequences

This improves the quality of update specs and prevents the system from generating changes without understanding the current feature.

It adds one extra step for update flows, especially when the existing feature is not yet mapped.