import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as api from '../api';
import { useRepositoryAttemptExpiry } from './use-repository-attempt-expiry';

export interface TreePageParameter {
  readonly page: number;
  readonly commitSha?: string;
}

export const repositoryKeys = {
  project: (projectKey: string) =>
    ['repository-context', 'project', projectKey] as const,
  available: (
    projectKey: string,
    installationId?: string,
    attemptScope?: string,
  ) =>
    [
      'repository-context',
      'available',
      projectKey,
      installationId ?? '',
      attemptScope ?? '',
    ] as const,
  branches: (projectKey: string, repositoryKey: string) =>
    ['repository-context', 'branches', projectKey, repositoryKey] as const,
  feature: (featureKey: string) =>
    ['repository-context', 'feature', featureKey] as const,
  tree: (
    projectKey: string,
    repositoryKey: string,
    branch: string,
    path: string,
    commitSha?: string,
  ) =>
    [
      'repository-context',
      'tree',
      projectKey,
      repositoryKey,
      branch,
      commitSha ?? '',
      path,
    ] as const,
};

export const projectRepositoryQueryOptions = (
  token: string,
  projectKey: string,
) =>
  queryOptions({
    queryKey: repositoryKeys.project(projectKey),
    queryFn: () => api.getProjectRepository(token, projectKey),
    staleTime: 0,
  });

export const availableRepositoriesQueryOptions = (
  token: string,
  projectKey: string,
  enabled: boolean,
  installationId?: string,
  attemptScope?: string,
) =>
  infiniteQueryOptions({
    queryKey: repositoryKeys.available(
      projectKey,
      installationId,
      attemptScope,
    ),
    queryFn: ({ pageParam }) =>
      api.getAvailableRepositories(
        token,
        projectKey,
        pageParam,
        installationId,
      ),
    initialPageParam: 1,
    getNextPageParam: nextPageNumber,
    enabled,
    staleTime: 60_000,
  });

export const branchesQueryOptions = (
  token: string,
  projectKey: string,
  repositoryKey: string,
  enabled = true,
) =>
  infiniteQueryOptions({
    queryKey: repositoryKeys.branches(projectKey, repositoryKey),
    queryFn: ({ pageParam }) => api.getBranches(token, projectKey, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPageNumber,
    enabled,
    staleTime: 60_000,
  });

export const treeQueryOptions = (
  token: string,
  projectKey: string,
  repositoryKey: string,
  branch: string,
  path: string,
  commitSha?: string,
  enabled = true,
) =>
  infiniteQueryOptions({
    queryKey: repositoryKeys.tree(
      projectKey,
      repositoryKey,
      branch,
      path,
      commitSha,
    ),
    queryFn: ({ pageParam }) =>
      api.getTree(
        token,
        projectKey,
        branch,
        path,
        pageParam.page,
        pageParam.commitSha,
      ),
    initialPageParam: {
      page: 1,
      ...(commitSha ? { commitSha } : {}),
    } satisfies TreePageParameter,
    getNextPageParam: nextTreePageParameter,
    enabled,
    staleTime: 60_000,
  });

export function useProjectRepository(token: string, projectKey: string) {
  const query = useQuery(projectRepositoryQueryOptions(token, projectKey));
  useRepositoryAttemptExpiry(query.data?.attemptExpiresAt, query.refetch);
  return query;
}

export function useAvailableRepositories(
  token: string,
  projectKey: string,
  enabled: boolean,
  installationId?: string,
  attemptScope?: string,
) {
  return useInfiniteQuery(
    availableRepositoriesQueryOptions(
      token,
      projectKey,
      enabled,
      installationId,
      attemptScope,
    ),
  );
}

export function useBranches(
  token: string,
  projectKey: string,
  repositoryKey: string,
  enabled = true,
) {
  return useInfiniteQuery(
    branchesQueryOptions(token, projectKey, repositoryKey, enabled),
  );
}

export function useRepositoryTree(
  token: string,
  projectKey: string,
  repositoryKey: string,
  branch: string,
  path: string,
  commitSha?: string,
  enabled = true,
) {
  return useInfiniteQuery(
    treeQueryOptions(
      token,
      projectKey,
      repositoryKey,
      branch,
      path,
      commitSha,
      enabled,
    ),
  );
}

export function useFeatureRepositoryContext(token: string, featureKey: string) {
  return useQuery({
    queryKey: repositoryKeys.feature(featureKey),
    queryFn: () => api.getFeatureRepositoryContext(token, featureKey),
    staleTime: 0,
  });
}

export function useRepositoryMutations(token: string, projectKey: string) {
  const client = useQueryClient();
  const resetConnectionData = (data?: api.ProjectRepositoryDto) => {
    if (data) client.setQueryData(repositoryKeys.project(projectKey), data);
    client.removeQueries({
      queryKey: ['repository-context', 'branches', projectKey],
    });
    client.removeQueries({
      queryKey: ['repository-context', 'tree', projectKey],
    });
    void client.invalidateQueries({
      queryKey: ['repository-context', 'feature'],
    });
  };
  return {
    attempt: useMutation({
      mutationFn: (mode: 'authorize' | 'install' = 'authorize') =>
        api.createGitHubAttempt(token, projectKey, mode),
      onSuccess: (data) => {
        client.removeQueries({
          queryKey: ['repository-context', 'available', projectKey],
        });
        client.setQueryData(repositoryKeys.project(projectKey), {
          state: 'connecting',
          githubAppAccessUrl: client.getQueryData<api.ProjectRepositoryDto>(
            repositoryKeys.project(projectKey),
          )?.githubAppAccessUrl,
          attemptExpiresAt: data.expiresAt,
        } satisfies api.ProjectRepositoryDto);
      },
    }),
    cancelAttempt: useMutation({
      mutationFn: () => api.cancelGitHubAttempt(token, projectKey),
      onSuccess: () => {
        client.removeQueries({
          queryKey: ['repository-context', 'available', projectKey],
        });
        void client.invalidateQueries({
          queryKey: repositoryKeys.project(projectKey),
        });
      },
    }),
    connect: useMutation({
      mutationFn: (input: { repositoryId: string; installationId?: string }) =>
        api.connectRepository(
          token,
          projectKey,
          input.repositoryId,
          input.installationId,
        ),
      onSuccess: resetConnectionData,
    }),
    updateBranch: useMutation({
      mutationFn: (branch: string) =>
        api.updateBaseBranch(token, projectKey, branch),
      onSuccess: resetConnectionData,
    }),
    disconnect: useMutation({
      mutationFn: () => api.disconnectRepository(token, projectKey),
      onSuccess: () => {
        client.removeQueries({
          queryKey: ['repository-context', 'available', projectKey],
        });
        resetConnectionData();
        void client.invalidateQueries({
          queryKey: repositoryKeys.project(projectKey),
        });
      },
    }),
  };
}

export function useUpdateFeatureRepositoryContext(
  token: string,
  featureKey: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      branchOverride: string | null;
      selectedPaths: readonly string[];
    }) => api.updateFeatureRepositoryContext(token, featureKey, input),
    onSuccess: (data) => {
      client.setQueryData(repositoryKeys.feature(featureKey), data);
    },
  });
}

export function flattenRepositoryPages(
  pages: readonly api.PageDto<api.ProviderRepositoryDto>[] | undefined,
): readonly api.ProviderRepositoryDto[] {
  const byId = new Map<string, api.ProviderRepositoryDto>();
  for (const page of pages ?? [])
    for (const item of page.items)
      if (!byId.has(item.repositoryId)) byId.set(item.repositoryId, item);
  return [...byId.values()].sort(
    (left, right) =>
      left.fullName.localeCompare(right.fullName) ||
      left.repositoryId.localeCompare(right.repositoryId),
  );
}

export function flattenBranchPages(
  pages: readonly api.PageDto<api.BranchDto>[] | undefined,
): readonly api.BranchDto[] {
  const byName = new Map<string, api.BranchDto>();
  for (const page of pages ?? [])
    for (const item of page.items)
      if (!byName.has(item.name)) byName.set(item.name, item);
  return [...byName.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function flattenTreePages(
  pages: readonly api.TreePageDto[] | undefined,
): readonly api.TreeItemDto[] {
  const byPath = new Map<string, api.TreeItemDto>();
  for (const page of pages ?? [])
    for (const item of page.items)
      if (!byPath.has(item.path)) byPath.set(item.path, item);
  return [...byPath.values()].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
}

export function nextTreePageParameter(
  lastPage: api.TreePageDto,
  pages: readonly api.TreePageDto[],
): TreePageParameter | undefined {
  return lastPage.hasNextPage
    ? {
        page: lastPage.page + 1,
        commitSha: pages[0]?.commitSha,
      }
    : undefined;
}

export function nextPageNumber<T>(
  lastPage: api.PageDto<T>,
): number | undefined {
  return lastPage.hasNextPage ? lastPage.page + 1 : undefined;
}
