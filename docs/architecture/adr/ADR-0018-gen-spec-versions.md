# ADR-0018: Version Generated Specs

Date: 2026-06-13

Status: accepted

Amended by: ADR-0021

## Context

Featurewise treats generated specifications as maintained artifacts, not disposable generated text.

Users need to review and edit generated specs. The system also needs to preserve meaningful versions without building a complex collaborative editor or full document version-control system.

## Decision

Generated specs start as drafts with `version = 0` and `valid = false`.

Versioning becomes meaningful when a user marks a spec valid. The first
validation for a target assigns `version = 1`; later validations for the same
target assign `last + 1`.

At most one generated spec can be marked `valid` per target. Marking a spec
valid atomically clears the previous valid spec for that same target.

Feature readiness remains on the `Feature`, not on the generated spec.

> **Amended by ADR-0021.** "At most one valid spec" and sequential validated
> versions apply **per target** (each Feature and each FeatureUpdate), not only
> per Feature. Editing a validated spec creates a new draft version in the
> background; it receives the next sequential version only when validated.

## Consequences

- The original generated output can be preserved.
- The latest user-reviewed artifact can evolve through explicit versions.
- Multiple generation attempts remain possible.
- The system can clearly identify the currently valid spec for each target.
- Complex collaborative editing, comments, branching, and diff workflows are deferred.
