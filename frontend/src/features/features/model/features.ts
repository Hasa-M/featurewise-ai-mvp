import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

import { getFeature, getProjectFeatures, type FeatureDto } from '../api';

export interface Feature {
  readonly alignment: FeatureDto['alignment'];
  readonly brief: string | null;
  readonly createdAt: Date;
  readonly createdById: string;
  readonly id: string;
  readonly includeInProjectContext: boolean;
  readonly origin: FeatureDto['origin'];
  readonly projectId: string;
  readonly title: string;
  readonly updatedAt: Date;
}

export const featureKeys = {
  detail: (featureId: string) => ['feature', featureId] as const,
  list: (projectId: string) => ['features', projectId] as const,
};

export function toFeature(dto: FeatureDto): Feature {
  return {
    ...dto,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export function projectFeaturesQueryOptions(
  accessToken: string,
  projectId: string,
) {
  return queryOptions({
    queryKey: featureKeys.list(projectId),
    queryFn: async () =>
      (await getProjectFeatures(accessToken, projectId)).map(toFeature),
    staleTime: 60 * 1000,
  });
}

export function featureQueryOptions(accessToken: string, featureId: string) {
  return queryOptions({
    queryKey: featureKeys.detail(featureId),
    queryFn: async () => toFeature(await getFeature(accessToken, featureId)),
    staleTime: 60 * 1000,
  });
}

export function useProjectFeatures(
  accessToken: string,
  projectId: string,
  enabled = true,
) {
  return useQuery({
    ...projectFeaturesQueryOptions(accessToken, projectId),
    enabled,
  });
}

export function useFeature(
  accessToken: string,
  projectId: string,
  featureId: string,
) {
  const queryClient = useQueryClient();
  const listKey = featureKeys.list(projectId);

  return useQuery({
    ...featureQueryOptions(accessToken, featureId),
    initialData: () =>
      queryClient
        .getQueryData<readonly Feature[]>(listKey)
        ?.find((feature) => feature.id === featureId),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(listKey)?.dataUpdatedAt,
  });
}
