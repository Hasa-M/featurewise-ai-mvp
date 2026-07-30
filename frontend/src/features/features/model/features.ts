import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

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

export interface CreateFeatureInput extends CreateFeatureDto {
  readonly projectId: string;
}

export interface FeatureQuickEditInput extends UpdateFeatureDto {
  readonly featureId: string;
}

export function useCreateFeature(accessToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, ...input }: CreateFeatureInput) =>
      toFeature(await createFeature(accessToken, projectId, input)),
    onSuccess: (feature) => {
      queryClient.setQueryData(featureKeys.detail(feature.id), feature);
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
    mutationFn: async ({ featureId, ...input }: FeatureQuickEditInput) =>
      toFeature(await updateFeature(accessToken, featureId, input)),
    onSuccess: (feature) => {
      queryClient.setQueryData(featureKeys.detail(feature.id), feature);
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
        queryKey: featureKeys.detail(feature.id),
        exact: true,
      });
    },
  });
}
