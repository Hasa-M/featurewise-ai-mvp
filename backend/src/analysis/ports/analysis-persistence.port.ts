import type {
  AnalysisInputSnapshotV1,
  AnalysisLifecycleVersions,
  AnalysisRunStatus,
  AnalysisSettingsV1,
  FindingReviewDecision,
  JsonObject,
  JsonValue,
  PreparedContextSnapshotV1,
  StructuredFindingDraftV1,
} from '../contracts/analysis-contracts';

export interface PersistedAnalysisRun {
  readonly publicKey: string;
  readonly featureKey: string;
  readonly createdByKey: string;
  readonly status: AnalysisRunStatus;
  readonly versions: AnalysisLifecycleVersions;
  readonly analysisSettings: AnalysisSettingsV1;
  readonly inputSnapshot: AnalysisInputSnapshotV1;
  readonly preparedContextSnapshot: PreparedContextSnapshotV1 | null;
  readonly errorMessage: string | null;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly updatedAt: string;
}

export interface AnalysisRunPersistencePort {
  findActiveForFeature(
    featureKey: string,
  ): Promise<PersistedAnalysisRun | null>;
  create(input: {
    readonly featureKey: string;
    readonly createdByKey: string;
    readonly versions: AnalysisLifecycleVersions;
    readonly analysisSettings: AnalysisSettingsV1;
    readonly inputSnapshot: AnalysisInputSnapshotV1;
  }): Promise<PersistedAnalysisRun>;
  getByPublicKey(analysisRunKey: string): Promise<PersistedAnalysisRun | null>;
  listForFeature(featureKey: string): Promise<readonly PersistedAnalysisRun[]>;
  transition(input: {
    readonly analysisRunKey: string;
    readonly from: readonly AnalysisRunStatus[];
    readonly to: AnalysisRunStatus;
    readonly errorMessage?: string;
    readonly transitionedAt: string;
  }): Promise<PersistedAnalysisRun>;
  writePreparedContextOnce(
    analysisRunKey: string,
    snapshot: PreparedContextSnapshotV1,
  ): Promise<PersistedAnalysisRun>;
}

export interface AnalysisFindingPersistencePort {
  appendMany(input: {
    readonly analysisRunKey: string;
    readonly findings: readonly {
      readonly draft: StructuredFindingDraftV1;
      readonly verificationMetadata: JsonObject;
    }[];
  }): Promise<
    readonly { readonly publicKey: string; readonly position: number }[]
  >;
  getByPublicKey(findingKey: string): Promise<JsonObject | null>;
  listForRun(analysisRunKey: string): Promise<readonly JsonObject[]>;
}

export interface FindingReviewPersistencePort {
  append(input: {
    readonly findingKey: string;
    readonly decision: FindingReviewDecision;
    readonly reason?: string;
    readonly createdByKey: string;
  }): Promise<JsonObject>;
  listForFinding(findingKey: string): Promise<readonly JsonObject[]>;
}

export interface LlmCallLogPersistencePort {
  append(input: {
    readonly analysisRunKey: string;
    readonly purpose:
      | 'candidate_analysis'
      | 'finding_verification'
      | 'schema_repair';
    readonly attempt: number;
    readonly provider: string;
    readonly model: string;
    readonly promptVersion: string;
    readonly schemaVersion: string;
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly latencyMs?: number;
    readonly estimatedCostMicros?: number;
    readonly outcome: 'success' | 'error';
    readonly errorMessage?: string;
    readonly rawResponse?: JsonValue;
  }): Promise<{ readonly publicKey: string }>;
}
