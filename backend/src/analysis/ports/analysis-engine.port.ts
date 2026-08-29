import type {
  AnalysisEngineInputV1,
  StructuredFindingOutputV1,
} from '../contracts/analysis-contracts';

export interface AnalysisEnginePort {
  analyze(input: AnalysisEngineInputV1): Promise<StructuredFindingOutputV1>;
}
