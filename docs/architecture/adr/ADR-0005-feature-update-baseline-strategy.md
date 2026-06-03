# ADR-005: Define baseline strategy for feature updates

Date: 2026-06-04

Status: accepted

## Context

A feature update cannot be properly analyzed without understanding the current state of the existing feature.

Some existing features may already be mapped inside the system, while others may exist only externally, in the real product.

## Decision

For `feature_update`, the system must know the baseline of the existing feature. This operation is therefore available only for features already present in the system.

If the feature is not yet mapped, the user must create it as a new feature, and the system must know its intent:

```
intentType:
- brand_new
- update_existing
```

The baseline context for `update_existing` is optional. The user can provide it through selected context artifacts.

## Consequences

This improves the quality of update specs and prevents the system from treating a request as a new-feature creation when it is actually an update (and vice versa).

It adds extra steps to the creation flow, but it lets the system interpret the new feature's context correctly.
