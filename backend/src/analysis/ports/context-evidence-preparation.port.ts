import type {
  AnalysisInputSnapshotV1,
  PreparedContextSnapshotIdentifier,
  PreparedContextSnapshotV1,
} from '../contracts/analysis-contracts';

export interface ContextEvidencePreparationPort {
  prepare(input: {
    readonly snapshotId: PreparedContextSnapshotIdentifier;
    readonly inputSnapshot: AnalysisInputSnapshotV1;
  }): Promise<PreparedContextSnapshotV1>;
}
