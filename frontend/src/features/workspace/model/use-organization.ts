import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  getOrganization,
  type OrganizationDto,
  updateOrganization,
} from '../api';

export interface Organization {
  readonly createdAt: Date;
  readonly id: string;
  readonly name: string;
  readonly updatedAt: Date;
}

export type OrganizationStatus = 'loading' | 'ready' | 'error';

export const organizationKeys = {
  detail: (organizationId: string) =>
    ['organization', organizationId] as const,
};

export function toOrganization(dto: OrganizationDto): Organization {
  return {
    createdAt: new Date(dto.createdAt),
    id: dto.id,
    name: dto.name,
    updatedAt: new Date(dto.updatedAt),
  };
}

export function organizationQueryOptions(
  accessToken: string,
  organizationId: string,
) {
  return queryOptions({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: async () =>
      toOrganization(await getOrganization(accessToken, organizationId)),
    staleTime: 5 * 60 * 1000,
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The organization could not be loaded.';
}

export function useOrganization(
  accessToken: string,
  organizationId: string,
) {
  const queryClient = useQueryClient();
  const query = useQuery(
    organizationQueryOptions(accessToken, organizationId),
  );
  const mutation = useMutation({
    mutationFn: async (name: string) =>
      toOrganization(
        await updateOrganization(accessToken, organizationId, { name }),
      ),
    onSuccess: (organization) => {
      queryClient.setQueryData(
        organizationKeys.detail(organizationId),
        organization,
      );
    },
  });

  return {
    errorMessage: query.error ? getErrorMessage(query.error) : null,
    organization: query.data ?? null,
    retry: query.refetch,
    status: query.isPending ? 'loading' : query.isError ? 'error' : 'ready',
    updateName: mutation.mutateAsync,
  } as const;
}
