# ADR-019: Version Generated Specs

Date: 2026-06-04

Status: accepted

## Context

Featurewise treats generated specifications as maintained artifacts, not disposable generated text.

Users need to review and edit generated specs. The system also needs to preserve meaningful versions without building a complex collaborative editor or full document version-control system.

## Decision

Model generated specifications with two entities:

- `GeneratedSpec`;
- `GeneratedSpecVersion`.

A `GeneratedSpec` belongs to a `SpecRun` and a `Feature`.

A `GeneratedSpecVersion` stores the structured JSON content for a specific saved version.

Version 0 is the original generated output. Later versions are created only when the user explicitly saves a new version. Visualised version is always the "last one".

NOTE:   For each feature, at most one generated spec can be marked as `valid`.
        Feature readiness remains on the `Feature`, not on the generated spec.

## Consequences

- The original generated output can be preserved.
- The latest user-reviewed artifact can evolve through explicit versions.
- Multiple generation attempts remain possible.
- The system can clearly identify the currently valid spec for a feature.
- Complex collaborative editing, comments, branching, and diff workflows are deferred.