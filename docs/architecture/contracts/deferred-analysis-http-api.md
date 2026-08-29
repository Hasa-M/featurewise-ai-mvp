# Deferred Analysis HTTP Contract

## Status and boundary

Every operation in this document is **deferred, provisional, unimplemented,
and unavailable**. The repository has no analysis controller or route. These
shapes document the intended future REST adapter from ADR-0032; the real
analyzer vertical slice must validate and finalize them before implementation.

The future adapter calls the analysis application boundary. It does not own
authorization, snapshot capture, lifecycle transitions, analyzer behavior,
finding persistence, or review projections. All identities below are ADR-0028
public keys. Database UUIDs are never accepted or returned.

## Shared provisional resources

```ts
type JSONValue =
  | boolean
  | number
  | string
  | null
  | readonly JSONValue[]
  | { readonly [key: string]: JSONValue };

type AnalysisRunStatus =
  | 'queued'
  | 'preparing_context'
  | 'analyzing'
  | 'validating_output'
  | 'repairing_output'
  | 'verifying_findings'
  | 'persisting'
  | 'completed'
  | 'failed';

interface AnalysisSettingsV1 {
  contractVersion: 'analysis-settings-v1';
  parameters: Record<string, JSONValue>;
}

interface AnalysisRunResource {
  publicKey: `RUN-${number}`;
  featureKey: `FEAT-${number}`;
  createdByKey: `USR-${number}`;
  status: AnalysisRunStatus;
  analyzerVersion: string;
  promptVersion: string;
  schemaVersion: string;
  analysisSettings: AnalysisSettingsV1;
  failure: { message: string } | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
}

interface EvidenceReferenceResource {
  sourceId: string;
  segmentId: string;
  locator?: string;
}

interface FindingReviewResource {
  publicKey: `FREV-${number}`;
  findingKey: `FND-${number}`;
  decision: 'accepted' | 'dismissed' | 'resolved' | 'deferred';
  reason: string | null;
  createdByKey: `USR-${number}`;
  createdAt: string;
}

interface AnalysisFindingResource {
  publicKey: `FND-${number}`;
  analysisRunKey: `RUN-${number}`;
  position: number;
  category: string;
  severity: string;
  title: string;
  description: string;
  whyItMatters: string;
  evidence: readonly EvidenceReferenceResource[];
  suggestedResolutions: readonly string[];
  verificationMetadata: Record<string, JSONValue>;
  latestReview: FindingReviewResource | null;
  createdAt: string;
}
```

Categories, severities, settings, and verification metadata remain governed by
recorded schema/settings versions. This document does not define analyzer,
prompt, provider, retry, repair, verification, deduplication, confidence, or
evaluation policy.

## Deferred operations

### Start analysis — unimplemented

```http
POST /features/:featureKey/analysis-runs
```

Provisional request:

```json
{
  "analysisSettings": {
    "contractVersion": "analysis-settings-v1",
    "parameters": {}
  }
}
```

Provisional success: `202 Accepted` with `AnalysisRunResource`. The future
application service resolves `featureKey`, selects recorded engine versions,
captures immutable inputs, creates the run, and enforces the one-active-run
constraint. None of that behavior is implemented in Phase 6.

### Read run status — unimplemented

```http
GET /analysis-runs/:analysisRunKey
```

Provisional success: `200 OK` with `AnalysisRunResource` after authorization
through the run's Feature, Project, and Organization ownership chain.

### Read Feature run history — unimplemented

```http
GET /features/:featureKey/analysis-runs
```

Provisional success:

```ts
interface AnalysisRunHistoryResponse {
  featureKey: `FEAT-${number}`;
  runs: readonly AnalysisRunResource[];
}
```

Runs are intended to be returned newest first. Pagination is deliberately not
fixed before the real vertical slice demonstrates a need and access pattern.

### Read findings — unimplemented

```http
GET /analysis-runs/:analysisRunKey/findings
```

Provisional success:

```ts
interface AnalysisFindingsResponse {
  analysisRunKey: `RUN-${number}`;
  findings: readonly AnalysisFindingResource[];
}
```

Evidence resolves only against the exact prepared-context snapshot owned by
the represented run. Prepared S3 metadata and database identifiers are not
part of this external response.

### Append finding review — unimplemented

```http
POST /analysis-findings/:findingKey/reviews
```

Provisional request:

```ts
interface AppendFindingReviewRequest {
  decision: 'accepted' | 'dismissed' | 'resolved' | 'deferred';
  reason?: string;
}
```

Provisional success: `201 Created` with `FindingReviewResource`. The future
operation appends a review and never updates or deletes the immutable finding
assertion or earlier reviews.

## Explicitly absent in Phase 6

There are no controllers, route decorators, Swagger registrations, frontend
API functions, query keys, hooks, polling, unavailable-state changes, prompts,
provider adapters, analyzer execution, fabricated findings, or lifecycle
orchestration backing this document.
