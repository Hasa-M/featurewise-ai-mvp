import type { CurrentUserContext } from '../../auth/current-user-context';
import type {
  AnalysisInputSnapshotV1,
  AnalysisInputSnapshotV2,
  AnalysisRunStatus,
  AnalysisSettingsV1,
  FindingReviewDecision,
  JsonObject,
} from '../contracts/analysis-contracts';

export interface CaptureAnalysisInputCommand {
  readonly projectKey: string;
  readonly featureKey: string;
  readonly analysisSettings: AnalysisSettingsV1;
}

export interface AnalysisInputCapturePort {
  captureInputSnapshot(
    currentUser: CurrentUserContext,
    command: CaptureAnalysisInputCommand,
  ): Promise<AnalysisInputSnapshotV1>;
  captureInputSnapshotV2(
    currentUser: CurrentUserContext,
    command: CaptureAnalysisInputCommand,
  ): Promise<AnalysisInputSnapshotV2>;
}

export interface AnalysisApplicationPort {
  startAnalysis(
    currentUser: CurrentUserContext,
    command: CaptureAnalysisInputCommand,
  ): Promise<{
    readonly analysisRunKey: string;
    readonly status: AnalysisRunStatus;
  }>;
  getAnalysisRun(
    currentUser: CurrentUserContext,
    analysisRunKey: string,
  ): Promise<JsonObject>;
  listFeatureAnalysisRuns(
    currentUser: CurrentUserContext,
    featureKey: string,
  ): Promise<readonly JsonObject[]>;
  listAnalysisFindings(
    currentUser: CurrentUserContext,
    analysisRunKey: string,
  ): Promise<readonly JsonObject[]>;
  appendFindingReview(
    currentUser: CurrentUserContext,
    input: {
      readonly findingKey: string;
      readonly decision: FindingReviewDecision;
      readonly reason?: string;
    },
  ): Promise<JsonObject>;
}
