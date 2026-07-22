import { request } from '@/shared/api';

export interface FeatureDto {
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
