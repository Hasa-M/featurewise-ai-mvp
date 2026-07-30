import { request } from '@/shared/api';

export interface FeatureDto {
  readonly activity: {
    readonly currentValidSpecVersion: number | null;
    readonly generationRunCount: number;
    readonly latestFeatureRun: {
      readonly runKind: 'generation' | 'consolidation';
      readonly status:
        | 'queued'
        | 'preparing_context'
        | 'calling_llm'
        | 'validating_output'
        | 'repairing_output'
        | 'checking_quality'
        | 'persisting'
        | 'completed'
        | 'failed';
      readonly usedProjectContext: boolean | null;
    } | null;
  };
  readonly alignment: {
    readonly pendingUpdates: readonly {
      readonly featureUpdateId: string;
      readonly generatedSpecId: string;
      readonly title: string;
      readonly version: number;
    }[];
    readonly status: 'aligned' | 'updates_pending';
  };
  readonly brief: string | null;
  readonly createdAt: string;
  readonly createdById: string;
  readonly id: string;
  readonly includeInProjectContext: boolean;
  readonly origin: 'brand_new' | 'mapped_existing';
  readonly projectId: string;
  readonly title: string;
  readonly updatedAt: string;
}

export interface CreateFeatureDto {
  readonly origin: FeatureDto['origin'];
  readonly title: string;
}

export interface UpdateFeatureDto {
  readonly brief?: string | null;
  readonly includeInProjectContext?: boolean;
  readonly title?: string;
}

export function getProjectFeatures(
  accessToken: string,
  projectId: string,
): Promise<readonly FeatureDto[]> {
  return request<readonly FeatureDto[]>(`/projects/${projectId}/features`, {
    accessToken,
  });
}

export function getFeature(
  accessToken: string,
  featureId: string,
): Promise<FeatureDto> {
  return request<FeatureDto>(`/features/${featureId}`, { accessToken });
}

export function createFeature(
  accessToken: string,
  projectId: string,
  input: CreateFeatureDto,
): Promise<FeatureDto> {
  return request<FeatureDto>(`/projects/${projectId}/features`, {
    accessToken,
    body: input,
    method: 'POST',
  });
}

export function updateFeature(
  accessToken: string,
  featureId: string,
  input: UpdateFeatureDto,
): Promise<FeatureDto> {
  return request<FeatureDto>(`/features/${featureId}`, {
    accessToken,
    body: input,
    method: 'PATCH',
  });
}

export function deleteFeature(
  accessToken: string,
  featureId: string,
): Promise<void> {
  return request<void>(`/features/${featureId}`, {
    accessToken,
    method: 'DELETE',
  });
}
