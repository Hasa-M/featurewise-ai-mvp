import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  getProject,
  getProjects,
  type ProjectDto,
  updateProject,
} from '../api';

export interface Project {
  readonly createdAt: Date;
  readonly id: string;
  readonly name: string;
  readonly organizationId: string;
  readonly updatedAt: Date;
}

export const projectKeys = {
  detail: (projectId: string) => ['project', projectId] as const,
  list: (organizationId: string) => ['projects', organizationId] as const,
};

export function toProject(dto: ProjectDto): Project {
  return {
    createdAt: new Date(dto.createdAt),
    id: dto.id,
    name: dto.name,
    organizationId: dto.organizationId,
    updatedAt: new Date(dto.updatedAt),
  };
}

export function projectsQueryOptions(
  accessToken: string,
  organizationId: string,
) {
  return queryOptions({
    queryKey: projectKeys.list(organizationId),
    queryFn: async () =>
      (await getProjects(accessToken, organizationId)).map(toProject),
    staleTime: 5 * 60 * 1000,
  });
}

export function projectQueryOptions(accessToken: string, projectId: string) {
  return queryOptions({
    queryKey: projectKeys.detail(projectId),
    queryFn: async () => toProject(await getProject(accessToken, projectId)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProjects(accessToken: string, organizationId: string) {
  return useQuery(projectsQueryOptions(accessToken, organizationId));
}

export function useProject(
  accessToken: string,
  organizationId: string,
  projectId: string,
) {
  const queryClient = useQueryClient();
  const listKey = projectKeys.list(organizationId);

  return useQuery({
    ...projectQueryOptions(accessToken, projectId),
    initialData: () =>
      queryClient
        .getQueryData<readonly Project[]>(listKey)
        ?.find((project) => project.id === projectId),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(listKey)?.dataUpdatedAt,
  });
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
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      queryClient.setQueryData<readonly Project[]>(
        projectKeys.list(project.organizationId),
        (current) =>
          current?.map((item) =>
            item.id === project.id ? project : item,
          ),
      );
    },
  });
}
