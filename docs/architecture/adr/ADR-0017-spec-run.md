# ADR-0017: Snapshot Feature Context for Each Spec Run

Date: 2026-06-13

Status: accepted

Amended by: ADR-0020, ADR-0021

## Context

A `SpecRun` represents one generation attempt at a specific point in time.

The editable `ContextArtifact` of a feature may change after a generation run. Without a snapshot, it would be difficult to understand which exact inputs produced a generated specification.

## Decision

Each `SpecRun` is an immutable snapshot of the effective feature context used during generation.

Only the current `ContextArtifact` remains editable. Snapshots are historical records and are not editable by users.

Uploaded files are stored under immutable S3 keys — uploads never overwrite an existing key — so snapshots reference keys and remain byte-stable without file duplication.

Heavy external sources (e.g. codebases) are not copied; the snapshot stores a stable reference such as a commit, tag, or branch link.

The ProjectContextSummary content is not snapshotted, only its inclusion flag.

> **Amended by ADR-0020 and ADR-0021.** The snapshot also copies relevant
> **spec contents**, not only context text:
>
> - update-target generation runs copy the **parent Feature's valid spec**, when one exists (ADR-0020);
> - consolidation runs copy the **feature's valid spec** (if any) **and all pending validated update specs** (ADR-0021).
>
> Spec contents are **referenced at the version used**

## Consequences

- Generated specs remain traceable to the inputs used at generation time.
- Later edits to the feature context do not change the meaning of previous runs.
- The system can support debugging, quality checks, LLM observability, and user trust.
- Some context data is duplicated, but this is acceptable because traceability is more important than perfect normalization.
- Runs that included the project summary or referenced external sources are not fully reproducible; accepted for phase 1.
