# ADR-017: Snapshot Feature Context for Each Spec Run

Status: accepted

## Context

A `SpecRun` represents one generation attempt at a specific point in time.

The editable `ContextArtifact` of a feature may change after a generation run. Without a snapshot, it would be difficult to understand which exact inputs produced a generated specification.

## Decision

Each `SpecRun` is an immutable snapshot of the effective feature context used during generation.

Only the current `ContextArtifact` remains editable. Snapshots are historical records and are not editable by users.

## Consequences

- Generated specs remain traceable to the inputs used at generation time.
- Later edits to the feature context do not change the meaning of previous runs.
- The system can support debugging, quality checks, LLM observability, and user trust.
- Some context data is duplicated, but this is acceptable because traceability is more important than perfect normalization.