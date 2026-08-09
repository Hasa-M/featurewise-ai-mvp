import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  getProject,
  getProjects,
  type ProjectDto,
  type ProjectSummaryDto,
  updateProject,
} from '../api';

export interface Project {
  readonly createdAt: Date;
  readonly id: string;
  readonly name: string;
  readonly organizationId: string;
  readonly publicKey: string;
  readonly updatedAt: Date;
}

export interface ProjectSummary extends Project {
  readonly featureCount: number;
}

export const projectKeys = {
  detail: (projectIdentifier: string) =>
    ['project', projectIdentifier] as const,
  list: (organizationId: string) => ['projects', organizationId] as const,
};

export function toProject(dto: ProjectDto): Project {
  return {
    createdAt: new Date(dto.createdAt),
    id: dto.id,
    name: dto.name,
    organizationId: dto.organizationId,
    publicKey: dto.publicKey,
    updatedAt: new Date(dto.updatedAt),
  };
}

export function toProjectSummary(dto: ProjectSummaryDto): ProjectSummary {
  return {
    ...toProject(dto),
    featureCount: dto.featureCount,
  };
}

export function adjustProjectFeatureCount(
  projects: readonly ProjectSummary[] | undefined,
  projectId: string,
  difference: number,
): readonly ProjectSummary[] | undefined {
  return projects?.map((project) =>
    project.id === projectId
      ? {
          ...project,
          featureCount: Math.max(0, project.featureCount + difference),
        }
      : project,
  );
}

export function projectsQueryOptions(
  accessToken: string,
  organizationId: string,
) {
  return queryOptions({
    queryKey: projectKeys.list(organizationId),
    queryFn: async () =>
      (await getProjects(accessToken, organizationId)).map(toProjectSummary),
    staleTime: 5 * 60 * 1000,
  });
}

export function projectQueryOptions(
  accessToken: string,
  projectIdentifier: string,
) {
  return queryOptions({
    queryKey: projectKeys.detail(projectIdentifier),
    queryFn: async () =>
      toProject(await getProject(accessToken, projectIdentifier)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProjects(accessToken: string, organizationId: string) {
  return useQuery(projectsQueryOptions(accessToken, organizationId));
}

export function useProject(
  accessToken: string,
  organizationId: string,
  projectIdentifier: string,
) {
  const queryClient = useQueryClient();
  const listKey = projectKeys.list(organizationId);

  const query = useQuery({
    ...projectQueryOptions(accessToken, projectIdentifier),
    initialData: () =>
      queryClient
        .getQueryData<readonly ProjectSummary[]>(listKey)
        ?.find(
          (project) =>
            project.id === projectIdentifier ||
            project.publicKey === projectIdentifier,
        ),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(listKey)?.dataUpdatedAt,
  });

  useEffect(() => {
    if (!query.data) return;

    queryClient.setQueryData(
      projectKeys.detail(query.data.publicKey),
      query.data,
    );
  }, [query.data, queryClient]);

  return query;
}

export function useUpdateProject(accessToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      projectId,
    }: {
      readonly name: string;
      readonly projectId: string;
    }) => toProject(await updateProject(accessToken, projectId, { name })),
    onSuccess: (project) => {
      queryClient.setQueriesData<Project>(
        { queryKey: ['project'] },
        (current) => (current?.id === project.id ? project : current),
      );
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      queryClient.setQueryData(
        projectKeys.detail(project.publicKey),
        project,
      );
      queryClient.setQueryData<readonly ProjectSummary[]>(
        projectKeys.list(project.organizationId),
        (current) =>
          current?.map((item) =>
            item.id === project.id ? { ...item, ...project } : item,
          ),
      );
    },
  });
}
