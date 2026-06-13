# ADR-0018: Version Generated Specs

Date: 2026-06-13

Status: accepted

Amended by: ADR-0021

## Context

Featurewise treats generated specifications as maintained artifacts, not disposable generated text.

Users need to review and edit generated specs. The system also needs to preserve meaningful versions without building a complex collaborative editor or full document version-control system.

## Decision

We add versioning to the generated spec, with the actual being set as last + 1, at the validation it is set as version 1:

Version is always 1 until the user decide to manually create a new one, they are not automatically generated for now.

> **Superseded by ADR-0021.** This no longer holds. Versions are
> created automatically every time a GenSpec signed as validated
> is edited.
NOTE: For each feature, at most one generated spec can be marked as `valid`.
Feature readiness remains on the `Feature`, not on the generated spec.

> **Amended by ADR-0021.** "At most one valid spec" applies **per target**
> (each Feature and each FeatureUpdate), not only per Feature. Marking a spec
> valid signal the **start of versioning** (every edit create a new version in the
> background).

## Consequences

- The original generated output can be preserved.
- The latest user-reviewed artifact can evolve through explicit versions.
- Multiple generation attempts remain possible.
- The system can clearly identify the currently valid spec for a feature.
- Complex collaborative editing, comments, branching, and diff workflows are deferred.
