# ADR-0031: Model Feature Specifications and Traceable Analysis Inputs

Date: 2026-08-28

Status: accepted

Supersedes: ADR-0016, ADR-0017

Amends: ADR-0007, ADR-0011, ADR-0014, ADR-0029

## Context

Analysis must distinguish the user's feature specification from supporting
context and must be reproducible after editable text or file selection changes.
The existing private S3 lifecycle already provides immutable object keys,
versions, checksums, preparation metadata, selection/archive behavior, and a
`firstUsedAt` protection boundary. Those guarantees remain useful, but the old
context model is coupled to FeatureUpdate and SpecRun generation terminology.

Findings also need stable evidence references. Resolving evidence against the
latest mutable context would make an analysis impossible to audit or evaluate.

## Decision

`Feature.specificationContent` stores the user-authored feature specification.
It replaces `Feature.brief`. A Feature may be created with empty content for
draft ergonomics, but a future analysis-start use case must reject blank
effective input.

Each Feature owns exactly one editable `ContextArtifact`. Its `content` stores
supporting feature context and replaces `promptContent`. Selected uploaded
files remain separate `StorageObject` inputs owned by that ContextArtifact.
There is no FeatureUpdate-owned context branch.

Each Project owns at most one editable `ProjectContext`. Its `content` replaces
the unfinished generated `ProjectContextSummary` concept. Project context is a
separate source, not a computed aggregate of selected Features.

Analysis uses two immutable stages:

1. `inputSnapshot` is created with the AnalysisRun. It captures the feature
   title and specification, feature and project context text, analysis
   settings, and selected ready file identities with exact original and
   prepared S3 keys, version IDs, checksums, MIME types, sizes, and preparation
   versions.
2. `preparedContextSnapshot` is written once during context preparation. It
   captures the exact normalized documents and segments presented to the
   analyzer.

Prepared context uses stable `sourceId` and `segmentId` values. Each source has
a source type, title, metadata, and ordered segments. Initial source types are
`feature_specification`, `feature_context`, `project_context`, and
`uploaded_file`. Evidence references contain a `sourceId`, `segmentId`, and an
optional human-readable locator, and they may resolve only inside the exact
prepared-context snapshot of their AnalysisRun.

These initial source types describe transport and persistence boundaries, not
an exhaustive semantic taxonomy. Requirements, designs, prior decisions,
product behavior, source code, business/domain rules, and organization
policies may be carried in their content or classified through source metadata
without creating new top-level domain entities or analysis pipelines.

Only selected, ready files enter a new input snapshot. Capturing a file
atomically sets `StorageObject.firstUsedAt` when it is not already set. A later
selection change cannot alter the snapshot, and a used object cannot be
physically purged. All immutable S3 lifecycle rules from ADR-0029 otherwise
remain in force.

The source model may later add dedicated organization context, project-file,
repository-revision, or connector adapters. This ADR does not add those
persistence sources, vector retrieval, or direct third-party integrations.

## Consequences

- Feature specification, supporting text, and uploaded files have distinct
  ownership and contracts.
- Every persisted finding can cite the exact source material analyzed.
- Analysis inputs remain reproducible after editable content changes.
- Project context becomes an explicit editable source in a later application
  phase.
- Existing S3 objects and lifecycle metadata are preserved during the domain
  migration; SQL migrations must never delete S3 objects.
- Unexpected FeatureUpdate-owned storage metadata must stop the later
  destructive migration rather than being silently discarded.
