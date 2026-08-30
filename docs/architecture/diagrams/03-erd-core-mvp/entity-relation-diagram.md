# ERD — Specification Analysis Domain

## Purpose

This is the implemented logical domain model from ADR-0030 through ADR-0032.
The Prisma schema and the forward migration
`20260828000000_specification_analysis_domain` implement these tables and
constraints.

Column names are camelCase here; Prisma maps them to snake_case in PostgreSQL.

## Diagram

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : has
    ORGANIZATION ||--o{ PROJECT : owns
    PROJECT ||--o| PROJECT_CONTEXT : has
    PROJECT ||--o{ FEATURE : contains
    FEATURE ||--|| CONTEXT_ARTIFACT : owns
    CONTEXT_ARTIFACT ||--o{ STORAGE_OBJECT : contains
    FEATURE ||--o{ ANALYSIS_RUN : analyzes
    ANALYSIS_RUN ||--o{ ANALYSIS_FINDING : produces
    ANALYSIS_FINDING ||--o{ FINDING_REVIEW : receives
    ANALYSIS_RUN ||--o{ LLM_CALL_LOG : logs
    USER ||--o{ FEATURE : creates
    USER ||--o{ ANALYSIS_RUN : starts
    USER ||--o{ FINDING_REVIEW : records

    ORGANIZATION {
        uuid id PK
        int publicNumber UK
        text name
        timestamptz createdAt
        timestamptz updatedAt
    }

    USER {
        uuid id PK
        int publicNumber UK
        uuid organizationId FK
        text username UK
        text passwordHash
        boolean isActive
        timestamptz createdAt
        timestamptz updatedAt
    }

    PROJECT {
        uuid id PK
        int publicNumber UK
        uuid organizationId FK
        text name
        timestamptz createdAt
        timestamptz updatedAt
    }

    PROJECT_CONTEXT {
        uuid id PK
        int publicNumber UK
        uuid projectId FK,UK
        text content
        timestamptz createdAt
        timestamptz updatedAt
    }

    FEATURE {
        uuid id PK
        int publicNumber UK
        uuid projectId FK
        text title
        text specificationContent
        uuid createdById FK
        timestamptz createdAt
        timestamptz updatedAt
        timestamptz deletedAt
    }

    CONTEXT_ARTIFACT {
        uuid id PK
        int publicNumber UK
        uuid featureId FK,UK
        text content
        timestamptz createdAt
        timestamptz updatedAt
    }

    STORAGE_OBJECT {
        uuid id PK
        int publicNumber UK
        uuid contextArtifactId FK
        uuid createdById FK
        text status
        boolean selected
        text uploadKey UK
        text s3Key UK
        text s3VersionId
        text assetType
        text mimeType
        bigint sizeBytes
        text originalFilename
        text checksumSha256
        text preparedS3Key UK
        text preparedS3VersionId
        text preparedMimeType
        bigint preparedSizeBytes
        text preparedChecksumSha256
        text preparationVersion
        timestamptz firstUsedAt
        timestamptz purgeRequestedAt
        timestamptz uploadExpiresAt
        timestamptz createdAt
        timestamptz updatedAt
    }

    ANALYSIS_RUN {
        uuid id PK
        int publicNumber UK
        uuid featureId FK
        text status
        text analyzerVersion
        text promptVersion
        text schemaVersion
        jsonb analysisSettings
        jsonb inputSnapshot
        jsonb preparedContextSnapshot
        text errorMessage
        uuid createdById FK
        timestamptz createdAt
        timestamptz startedAt
        timestamptz finishedAt
        timestamptz updatedAt
    }

    ANALYSIS_FINDING {
        uuid id PK
        int publicNumber UK
        uuid analysisRunId FK
        int position
        text category
        text severity
        text title
        text description
        text whyItMatters
        jsonb evidence
        jsonb suggestedResolutions
        jsonb verificationMetadata
        timestamptz createdAt
    }

    FINDING_REVIEW {
        uuid id PK
        int publicNumber UK
        uuid findingId FK
        text decision
        text reason
        uuid createdById FK
        timestamptz createdAt
    }

    LLM_CALL_LOG {
        uuid id PK
        int publicNumber UK
        uuid analysisRunId FK
        text purpose
        int attempt
        text provider
        text model
        text promptVersion
        text schemaVersion
        int inputTokens
        int outputTokens
        int latencyMs
        bigint estimatedCostMicros
        text outcome
        text errorMessage
        jsonb rawResponse
        timestamptz createdAt
    }
```

Nullable fields are shown without special Mermaid notation. They include
`deletedAt`, prepared object metadata until preparation completes,
`preparedContextSnapshot` until context preparation completes, run error and
lifecycle timestamps, optional LLM usage/cost/error fields, and review reason.

## Required database invariants

- Every externally identifiable domain table keeps its independent positive,
  immutable `publicNumber` contract from ADR-0028. Current prefixes are `PCTX`,
  `RUN`, `FND`, `FREV`, and `CALL`; `UPD` and `SPEC` are removed.
- A Feature has one ContextArtifact from creation. `featureId` is non-null and
  unique; there is no exclusive Feature/FeatureUpdate owner arc.
- At most one non-terminal AnalysisRun exists per Feature. A PostgreSQL partial
  unique index is the race-safe constraint.
- `(analysisRunId, position)` is unique for AnalysisFinding.
- Findings are immutable model assertions. FindingReview rows are append-only;
  latest review is a projection, not a finding status mutation.
- `inputSnapshot` is immutable from run creation.
  `preparedContextSnapshot` may transition once from null to a value and is
  write-once afterward. Run lifecycle state, timestamps, and failure details
  remain mutable.
- Category and severity are schema-versioned strings, not database enums.

## Initial vocabularies

AnalysisRun statuses are exactly:

```text
queued | preparing_context | analyzing | validating_output |
repairing_output | verifying_findings | persisting | completed | failed
```

FindingReview decisions are:

```text
accepted | dismissed | resolved | deferred
```

Initial schema-governed categories are `missing_information`, `ambiguity`,
`inconsistency`, `unresolved_decision`, `missing_edge_case`, `testability`, and
`context_mismatch`. Initial severities are `low`, `medium`, `high`, and
`critical`.

LLM call purposes are `candidate_analysis`, `finding_verification`, and
`schema_repair`; outcomes are `success` or `error`.

## Context snapshot boundary

`inputSnapshot` captures feature specification, feature/project context,
selected ready file identities with exact immutable object versions and
checksums, analysis settings, and source identifiers.
`preparedContextSnapshot` captures the exact source documents and segments
presented to analysis. Finding evidence may reference only source and segment
IDs inside that prepared snapshot. See ADR-0031.

## Migration guard

The `20260828000000_specification_analysis_domain` migration contains a
preflight that stops unless FeatureUpdate, update-owned context/storage
metadata, SpecRun, GeneratedSpec, and legacy LLM log counts are zero. It
preserves Feature-owned ContextArtifact and StorageObject rows and never
deletes S3 objects.
