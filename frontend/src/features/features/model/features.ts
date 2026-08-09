import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  createFeature,
  deleteFeature,
  getFeature,
  getProjectFeatures,
  type CreateFeatureDto,
  type FeatureDto,
  type UpdateFeatureDto,
  updateFeature,
} from '../api';

export interface Feature {
  readonly activity: FeatureDto['activity'];
  readonly alignment: FeatureDto['alignment'];
  readonly brief: string | null;
  readonly createdAt: Date;
  readonly createdById: string;
  readonly id: string;
  readonly includeInProjectContext: boolean;
  readonly origin: FeatureDto['origin'];
  readonly projectId: string;
  readonly publicKey: string;
  readonly title: string;
  readonly updatedAt: Date;
}

export const featureKeys = {
  detail: (projectIdentifier: string, featureIdentifier: string) =>
    ['feature', projectIdentifier, featureIdentifier] as const,
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
  projectIdentifier = projectId,
) {
  return queryOptions({
    queryKey: featureKeys.list(projectId),
    queryFn: async () =>
      (await getProjectFeatures(accessToken, projectIdentifier)).map(toFeature),
    staleTime: 60 * 1000,
  });
}

export function featureQueryOptions(
  accessToken: string,
  projectIdentifier: string,
  featureIdentifier: string,
) {
  return queryOptions({
    queryKey: featureKeys.detail(projectIdentifier, featureIdentifier),
    queryFn: async () =>
      toFeature(
        await getFeature(
          accessToken,
          projectIdentifier,
          featureIdentifier,
        ),
      ),
    staleTime: 60 * 1000,
  });
}

export function useProjectFeatures(
  accessToken: string,
  projectId: string,
  projectIdentifier = projectId,
  enabled = true,
) {
  return useQuery({
    ...projectFeaturesQueryOptions(
      accessToken,
      projectId,
      projectIdentifier,
    ),
    enabled,
  });
}

export function useFeature(
  accessToken: string,
  projectId: string,
  projectIdentifier: string,
  featureIdentifier: string,
  canonicalProjectKey?: string,
) {
  const queryClient = useQueryClient();
  const listKey = featureKeys.list(projectId);

  const query = useQuery({
    ...featureQueryOptions(
      accessToken,
      projectIdentifier,
      featureIdentifier,
    ),
    initialData: () =>
      queryClient
        .getQueryData<readonly Feature[]>(listKey)
        ?.find(
          (feature) =>
            feature.id === featureIdentifier ||
            feature.publicKey === featureIdentifier,
        ),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(listKey)?.dataUpdatedAt,
  });

  useEffect(() => {
    if (!query.data || !canonicalProjectKey) return;

    queryClient.setQueryData(
      featureKeys.detail(canonicalProjectKey, query.data.publicKey),
      query.data,
    );
  }, [canonicalProjectKey, query.data, queryClient]);

  return query;
}

export interface CreateFeatureInput extends CreateFeatureDto {
  readonly projectId: string;
}

export interface FeatureUpdateInput extends UpdateFeatureDto {
  readonly featureId: string;
}

export type FeatureQuickEditInput = FeatureUpdateInput;

export function useCreateFeature(accessToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, ...input }: CreateFeatureInput) =>
      toFeature(await createFeature(accessToken, projectId, input)),
    onSuccess: (feature) => {
      queryClient.setQueryData(
        featureKeys.detail(feature.projectId, feature.id),
        feature,
      );
      queryClient.setQueryData<readonly Feature[]>(
        featureKeys.list(feature.projectId),
        (current) => [
          feature,
          ...(current?.filter((item) => item.id !== feature.id) ?? []),
        ],
      );
    },
  });
}

export function useUpdateFeature(accessToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ featureId, ...input }: FeatureUpdateInput) =>
      toFeature(await updateFeature(accessToken, featureId, input)),
    onSuccess: (feature) => {
      queryClient.setQueriesData<Feature>(
        { queryKey: ['feature'] },
        (current) => (current?.id === feature.id ? feature : current),
      );
      queryClient.setQueryData(
        featureKeys.detail(feature.projectId, feature.id),
        feature,
      );
      queryClient.setQueryData<readonly Feature[]>(
        featureKeys.list(feature.projectId),
        (current) =>
          current?.map((item) =>
            item.id === feature.id ? feature : item,
          ),
      );
    },
  });
}

export function useDeleteFeature(accessToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feature: Feature) => {
      await deleteFeature(accessToken, feature.id);
      return feature;
    },
    onSuccess: (feature) => {
      queryClient.setQueryData<readonly Feature[]>(
        featureKeys.list(feature.projectId),
        (current) => current?.filter((item) => item.id !== feature.id),
      );
      queryClient.removeQueries({
        predicate: (query) => {
          const data = query.state.data as Feature | undefined;

          return query.queryKey[0] === 'feature' && data?.id === feature.id;
        },
      });
    },
  });
}
