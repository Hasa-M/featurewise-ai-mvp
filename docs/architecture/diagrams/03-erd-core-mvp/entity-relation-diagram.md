# ERD — Core MVP Domain Model

## Purpose

Canonical entity-relationship model for the phase 1 backend.

This Mermaid file is the **source of truth** for the schema. The previous
`erd-core-mvp.drawio` is removed and must not come back: drawio XML is not
PR-reviewable and not safely editable by coding agents. Once migrations exist,
the migrations become the operational truth and this document is kept in sync
with them (AGENTS.md rule).

Column names are camelCase here; the ORM maps them to snake_case in PostgreSQL.

## Diagram

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : "has (phase 1: exactly one)"
    ORGANIZATION ||--o{ PROJECT : "has (phase 1: exactly one)"
    PROJECT ||--o| PROJECT_CONTEXT_SUMMARY : "has"
    PROJECT ||--o{ FEATURE : "contains"
    FEATURE ||--o{ FEATURE_UPDATE : "has increments"
    FEATURE |o--|| CONTEXT_ARTIFACT : "owns exactly one (exclusive)"
    FEATURE_UPDATE |o--|| CONTEXT_ARTIFACT : "owns exactly one (exclusive)"
    CONTEXT_ARTIFACT ||--o{ STORAGE_OBJECT : "has uploads"
    FEATURE ||--o{ SPEC_RUN : "scopes"
    FEATURE_UPDATE |o--o{ SPEC_RUN : "optional target"
    FEATURE ||--o{ GENERATED_SPEC : "scopes"
    FEATURE_UPDATE |o--o{ GENERATED_SPEC : "optional target"
    SPEC_RUN |o--o| GENERATED_SPEC : "produces a draft version"
    GENERATED_SPEC |o--o{ GENERATED_SPEC : "derives from (parentSpecId)"
    SPEC_RUN ||--o{ LLM_CALL_LOG : "logs attempts"

    ORGANIZATION {
        uuid organizationId PK
        text name
        timestamptz createdAt
        timestamptz updatedAt
    }

    USER {
        uuid userId PK
        uuid organizationId FK
        text username UK
        text passwordHash "Argon2id via standard library (ADR-0015)"
        boolean isActive
        timestamptz createdAt
        timestamptz updatedAt
    }

    PROJECT {
        uuid projectId PK
        uuid organizationId FK
        text name
        timestamptz createdAt
        timestamptz updatedAt
    }

    PROJECT_CONTEXT_SUMMARY {
        uuid summaryId PK
        uuid projectId FK "unique - at most one summary per project"
        text content
        timestamptz createdAt
        timestamptz updatedAt
    }

    FEATURE {
        uuid featureId PK
        uuid projectId FK
        text title
        text brief "short statement; deep context lives in the ContextArtifact"
        text origin "brand_new | mapped_existing (ADR-0020)"
        text status "enum TBD - proposal: draft | in_review | ready | shipped"
        boolean includeInProjectContext "feeds ProjectContextSummary"
        uuid createdBy FK "User"
        timestamptz createdAt
        timestamptz updatedAt
        timestamptz deletedAt "nullable - soft delete"
    }

    FEATURE_UPDATE {
        uuid featureUpdateId PK
        uuid featureId FK "parent - exactly one nesting level (ADR-0020)"
        text title
        text brief
        text status "same enum as Feature"
        uuid createdBy FK "User"
        timestamptz createdAt
        timestamptz updatedAt
        timestamptz deletedAt "nullable - soft delete"
    }

    CONTEXT_ARTIFACT {
        uuid contextArtifactId PK
        uuid featureId FK "nullable + unique (exclusive owner arc)"
        uuid featureUpdateId FK "nullable + unique (exclusive owner arc)"
        text content "the editable effective working context"
        timestamptz createdAt
        timestamptz updatedAt
    }

    STORAGE_OBJECT {
        uuid storageObjectId PK
        uuid contextArtifactId FK
        text s3Key UK "immutable, never overwritten (ADR-0017)"
        text assetType "image | file"
        text mimeType
        bigint sizeBytes
        text originalFilename
        text extractedText "nullable (ADR-0011)"
        timestamptz createdAt
    }

    SPEC_RUN {
        uuid specRunId PK
        uuid featureId FK "always set (scope; parent feature for update runs)"
        uuid featureUpdateId FK "nullable - set when the target is an update"
        text runKind "generation | consolidation (ADR-0021)"
        text status "queued..completed|failed - 9 values (ADR-0019)"
        text promptVersion
        text schemaVersion
        jsonb genSettings "provider, model, includeProjectSummary, ..."
        jsonb contextSnapshot "immutable - shape defined below (ADR-0017/0021)"
        text errorMessage "nullable - set on failed"
        uuid createdBy FK "User"
        timestamptz createdAt
        timestamptz startedAt "nullable"
        timestamptz finishedAt "nullable"
        timestamptz updatedAt
    }

    GENERATED_SPEC {
        uuid generatedSpecId PK
        uuid featureId FK "always set - equals the run or parent target"
        uuid featureUpdateId FK "nullable - equals the run or parent target"
        uuid specRunId FK "nullable - set only when produced by a run"
        uuid parentSpecId FK "nullable self-reference - derivation lineage"
        int version "sequential per target: last + 1, validation is 1 (ADR-0021)"
        jsonb content "editable only while valid = false (ADR-0021)"
        text schemaVersion
        boolean valid "default false; at most one per target; freezes content"
        jsonb warnings "generation-time quality checks (ADR-0019)"
        jsonb incorporatedUpdates "feature-target only - see shape below (ADR-0021)"
        timestamptz createdAt
        timestamptz updatedAt
    }

    LLM_CALL_LOG {
        uuid llmCallId PK
        uuid specRunId FK
        text purpose "generation | schema_repair"
        int attempt
        text provider
        text model
        text promptVersion
        text schemaVersion
        int inputTokens
        int outputTokens
        int latencyMs
        text outcome "success | error"
        text errorMessage "nullable"
        jsonb rawResponse "nullable - only attempts that failed validation/repair"
        timestamptz createdAt
    }
```

## Database-level constraints (must exist in the first migration)

```sql
-- ContextArtifact: exactly one owner, and each owner has at most one artifact
CHECK (num_nonnulls(feature_id, feature_update_id) = 1);
UNIQUE (feature_id);
UNIQUE (feature_update_id);

-- SpecRun: consolidation runs are feature-target only (ADR-0021)
CHECK (run_kind <> 'consolidation' OR feature_update_id IS NULL);

-- SpecRun: at most one non-terminal run per target (ADR-0019/0020).
-- These indexes are the race-safe source of the 409, not a check-then-insert.
CREATE UNIQUE INDEX one_active_run_per_feature ON spec_run (feature_id)
  WHERE feature_update_id IS NULL AND status NOT IN ('completed','failed');
CREATE UNIQUE INDEX one_active_run_per_update ON spec_run (feature_update_id)
  WHERE feature_update_id IS NOT NULL AND status NOT IN ('completed','failed');

-- GeneratedSpec: sequential version per target (ADR-0021)
CREATE UNIQUE INDEX spec_version_per_feature ON generated_spec (feature_id, version)
  WHERE feature_update_id IS NULL;
CREATE UNIQUE INDEX spec_version_per_update ON generated_spec (feature_update_id, version)
  WHERE feature_update_id IS NOT NULL;

-- GeneratedSpec: at most one valid spec per target (ADR-0018/0021)
CREATE UNIQUE INDEX one_valid_spec_per_feature ON generated_spec (feature_id)
  WHERE valid AND feature_update_id IS NULL;
CREATE UNIQUE INDEX one_valid_spec_per_update ON generated_spec (feature_update_id)
  WHERE valid AND feature_update_id IS NOT NULL;
```

## Application-level rules (not expressible as simple constraints)

- **Run preconditions (else 422):** `generation` on a Feature requires
  `origin = brand_new`. `generation` on a FeatureUpdate requires a _usable
  parent baseline_. `consolidation` (feature target, any origin) requires at
  least one validated update spec not yet incorporated by the feature's
  current valid spec.
- **Usable baseline** = parent ContextArtifact content is non-empty, OR at
  least one StorageObject exists on it, OR the parent Feature has a valid
  GeneratedSpec.
- An empty ContextArtifact is created automatically, in the same transaction,
  when a Feature or FeatureUpdate is created — that is how the "exactly one"
  invariant holds from birth.
- **Version assignment:** every new GeneratedSpec (run-produced or manual)
  gets `version = last + 1` for its target; the unique index backs this up.
- **Validity freeze (ADR-0021):** `content` is editable only while
  `valid = false`. Marking a spec valid freezes it and atomically clears the
  `valid` flag on the previously valid spec of the same target.
- Manual (user-created) versions copy `incorporatedUpdates` from their
  `parentSpecId` spec.
- A GeneratedSpec's `featureId`/`featureUpdateId` must equal its run's target
  (run-produced) or its parent's target (manual versions).
- **Alignment is computed, never stored** (see below).
- A Feature or FeatureUpdate with a non-terminal SpecRun cannot be deleted.
- StorageObject rows are immutable; replacing a file means a new row and a new
  S3 key. S3 objects are **never deleted** in phase 1 because SpecRun
  snapshots reference keys (ADR-0017).
- Soft delete (`deletedAt`) exists only on Feature and FeatureUpdate. Runs,
  specs, and logs are immutable history and are never deleted.

## `incorporatedUpdates` JSONB shape (GeneratedSpec, feature target only)

```json
[{ "featureUpdateId": "...", "generatedSpecId": "...", "version": 2 }]
```

## Computed alignment (never stored)

For a Feature, `alignment.status = updates_pending` when at least one
non-deleted FeatureUpdate has a **current valid spec** whose
`generatedSpecId` is not present in the feature's **current valid spec**
`incorporatedUpdates` (a feature with validated updates and no valid spec of
its own is also `updates_pending`). Otherwise `aligned`.

Comparing spec **ids** (not timestamps) means: re-validating an update with a
new spec version automatically re-flags the feature, and soft-deleted updates
drop out of the computation. The API exposes
`alignment: { status, pendingUpdates[] }` on feature reads.

## `contextSnapshot` JSONB shape (SpecRun)

```json
{
    "snapshotVersion": 2,
    "target": "feature | feature_update",
    "runKind": "generation | consolidation",
    "featureContext": {
        "content": "copied text of the (parent) Feature ContextArtifact",
        "storageObjects": [
            {
                "s3Key": "...",
                "assetType": "image",
                "mimeType": "...",
                "originalFilename": "..."
            }
        ],
        "externalRefs": ["e.g. repo@commit, figma link"]
    },
    "updateContext": "same shape as featureContext, or null",
    "featureValidSpec": {
        "generatedSpecId": "...",
        "version": 3,
        "content": {}
    },
    "updatesToIncorporate": [
        {
            "featureUpdateId": "...",
            "generatedSpecId": "...",
            "version": 2,
            "title": "...",
            "content": {}
        }
    ],
    "includeProjectSummary": false
}
```

Field usage per run kind:

| Field                  | generation (feature) | generation (update)        | consolidation                      |
| ---------------------- | -------------------- | -------------------------- | ---------------------------------- |
| `featureContext`       | own context          | parent baseline            | own context                        |
| `updateContext`        | null                 | update context             | null                               |
| `featureValidSpec`     | null                 | parent's valid spec if any | feature's valid spec if any        |
| `updatesToIncorporate` | null                 | null                       | all pending validated update specs |

Per ADR-0017/0021: text and spec contents are **copied** (specs are editable
while drafts, so id references would not be byte-stable), S3 keys are
referenced (immutable), external sources are referenced not copied, and the
ProjectContextSummary content is not snapshotted — only its inclusion flag.

## Open decisions still pending (tracked, not blockers for the ERD)

- `status` enum values for Feature/FeatureUpdate are a proposal
  (`draft | in_review | ready | shipped`) — confirm or replace before the
  first migration.
- ProjectContextSummary has a defined shape but **no write path yet**; its
  generation/update flow needs its own ADR before the entity is more than a
  manually edited text field.
- `normalizedContent` from the old ERD is intentionally dropped for phase 1:
  prompts use `ContextArtifact.content` plus `StorageObject.extractedText`
  directly.
