# ADR-019: Version Generated Specs

Date: 2026-06-04

Status: accepted

## Context

Featurewise treats generated specifications as maintained artifacts, not disposable generated text.

Users need to review and edit generated specs. The system also needs to preserve meaningful versions without building a complex collaborative editor or full document version-control system.

## Decision

We add versioning to the generated spec, with the actual being set as last + 1, and the first as 1:

Version is always 1 untile the user decide to manually create a new one, they are not automatically generated for now.

NOTE:   For each feature, at most one generated spec can be marked as `valid`.
        Feature readiness remains on the `Feature`, not on the generated spec.

## Consequences

- The original generated output can be preserved.
- The latest user-reviewed artifact can evolve through explicit versions.
- Multiple generation attempts remain possible.
- The system can clearly identify the currently valid spec for a feature.
- Complex collaborative editing, comments, branching, and diff workflows are deferred.