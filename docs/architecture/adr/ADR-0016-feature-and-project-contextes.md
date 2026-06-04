# ADR-016: Model Feature Context as a Single Editable Context Artifact

Date: 2026-06-05

Status: accepted

## Context

Featurewise needs structured context for each feature before generating an implementation-readiness specification.

There is so the need for a core editable context that should belong to the feature itself.

In addition there is the need to a project context summary that the user could use or not inside a feature.

## Decision

Each `Feature` has one editable `ContextArtifact`.

The `ContextArtifact` represents the effective working context for that feature, including product notes, design information, code/context notes, execution rules, uploaded files, screenshots, and other relevant inputs.

For phase 1:

- `ContextArtifact` belongs only to `Feature`;
- `Feature` has exactly one `ContextArtifact`;
- the user edits only the current effective `ContextArtifact`;
- project context is not modeled as editable context artifacts.

The project may use selected feature knowledge to update a separate system-generated `ProjectContextSummary`.

## Consequences

- The MVP has one clear editable context object per feature.
- The feature remains the main product object.
- Context editing is simpler for the user and easier to implement.
- Project-level knowledge is handled separately through a generated project summary.
- The system avoids premature complexity around many context artifact records, scopes, and reusable presets.
