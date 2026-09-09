# Sequence — Analysis Application Boundary and Lifecycle

## Purpose and implementation status

This sequence defines the deferred application flow accepted by ADR-0031 and
ADR-0032, as amended for repository context by ADR-0033. It is not an implemented
endpoint contract. The REST controller,
analyzer, provider adapter, retries, verifier policy, and polling UI remain
deferred until a real analyzer vertical slice exists.

Feature is the sole analysis target. There is no FeatureOrigin, FeatureUpdate,
generation run, GeneratedSpec, validation, consolidation, or alignment flow.

## Lifecycle

```text
queued
  -> preparing_context
  -> analyzing
  -> validating_output
  -> repairing_output       (only when structured output needs repair)
  -> verifying_findings
  -> persisting
  -> completed | failed
```

`completed` and `failed` are terminal. `repairing_output` may return to
`validating_output`; exact repair/retry limits are deferred to the analyzer
vertical slice.

## Deferred sequence

```mermaid
sequenceDiagram
    autonumber
    actor Client as Console / future adapter
    participant HTTP as Future REST adapter
    participant APP as Analysis application service
    participant CTX as Context preparation port
    participant REPO as Repository context port
    participant GH as GitHub API
    participant ENG as Analysis engine port
    participant DB as Analysis persistence
    participant S3 as Private S3 adapter

    Note over Client,HTTP: HTTP operations are deferred until the analyzer can back them
    Client->>HTTP: Request analysis for Feature
    HTTP->>APP: startAnalysis(featureKey, actor, settings)
    APP->>DB: Read and authorize Feature, repository config, and selected paths
    DB-->>APP: Configuration version plus selected paths
    opt Feature has repository context
        APP->>REPO: capture repository_revision
        REPO->>GH: Resolve branch to commit SHA
        REPO->>GH: Read bounded tree and required blobs at that commit
        GH-->>REPO: Exact tree/blob identities and bytes
        REPO-->>APP: Filtered manifest, root files, and all selected files
        Note over APP,GH: No PostgreSQL transaction remains open during GitHub calls
        APP->>DB: Begin final transaction; lock and re-read consistency token
        DB-->>APP: Unchanged configuration or conflict
    end
    APP->>DB: Capture local inputs and set selected StorageObject.firstUsedAt
    APP->>APP: Validate complete immutable inputSnapshot v2
    APP->>DB: Insert AnalysisRun with immutable inputSnapshot (queued), then commit
    Note over APP,DB: Partial unique index rejects a second active run for the Feature
    Note over APP,DB: Any consistency or snapshot validation failure rolls back firstUsedAt
    APP-->>HTTP: Accepted AnalysisRun identity and status
    HTTP-->>Client: Future 202 response

    APP->>DB: status = preparing_context
    APP->>CTX: Prepare exact sources from inputSnapshot
    CTX->>S3: Read recorded object keys and versions
    S3-->>CTX: Exact original/prepared bytes
    CTX-->>APP: Versioned documents, segments, and evidence identities
    APP->>DB: Write preparedContextSnapshot once

    APP->>DB: status = analyzing
    APP->>ENG: analyze(prepared input, versions, settings)
    ENG-->>APP: Structured finding drafts

    APP->>DB: status = validating_output
    alt output needs schema repair
        APP->>DB: status = repairing_output
        APP->>ENG: repair structured output
        ENG-->>APP: repaired finding drafts
        APP->>DB: status = validating_output
    end

    APP->>DB: status = verifying_findings
    APP->>ENG: verify evidence, relevance, and overlap
    ENG-->>APP: zero or more verified findings

    APP->>DB: status = persisting
    APP->>DB: Insert immutable AnalysisFinding rows and LLM call logs
    APP->>DB: status = completed, finishedAt set

    Client->>HTTP: Read run/findings (future)
    HTTP->>APP: Query authorized run and findings
    APP-->>HTTP: Run plus evidence-backed findings
    HTTP-->>Client: Future response

    opt Human reviews a finding
        Client->>HTTP: Record accepted/dismissed/resolved/deferred (future)
        HTTP->>APP: appendFindingReview(findingKey, actor, decision, reason)
        APP->>DB: Insert append-only FindingReview
        APP-->>HTTP: Current review projection
        HTTP-->>Client: Future response
    end

    Note over APP,DB: Any unrecoverable failure writes failed + errorMessage + finishedAt
```

## Deferred REST adapter

The intended adapter shape is documented for boundary clarity only:

```text
POST /features/:featureKey/analysis-runs
GET  /analysis-runs/:analysisRunKey
GET  /features/:featureKey/analysis-runs
GET  /analysis-runs/:analysisRunKey/findings
POST /analysis-findings/:findingKey/reviews
```

These routes must not be added as placeholders. Their response shapes are
finalized with the analyzer vertical slice and must use public keys under
ADR-0028.

## Invariants

- The application service, not a controller or client, owns authorization,
  one-active-run enforcement, snapshots, lifecycle transitions, and review
  recording.
- Inputs and prepared context are immutable and version-aware. Evidence never
  resolves against the latest mutable context.
- A repository source is `repository_revision`: one resolved commit, bounded
  filtered manifest, automatic root allowlist, and every mandatory selected
  Feature file. GitHub retrieval precedes one final PostgreSQL transaction;
  concurrent configuration changes or invalid v2 output abort that transaction
  and roll back local first-use markers.
- Findings remain model assertions; reviews never overwrite them.
- The engine may return zero findings.
- LLM calls originate only in the backend through an adapter.
- Execution remains inside NestJS for the local-first MVP; no queue, worker,
  dedicated AI service, or multi-agent orchestration is introduced.
