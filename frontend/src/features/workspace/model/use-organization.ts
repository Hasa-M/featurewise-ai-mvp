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
  readonly publicKey: string;
  readonly name: string;
  readonly updatedAt: Date;
}

export type OrganizationStatus = 'loading' | 'ready' | 'error';

export const organizationKeys = {
  detail: (organizationKey: string) =>
    ['organization', organizationKey] as const,
};

export function toOrganization(dto: OrganizationDto): Organization {
  return {
    createdAt: new Date(dto.createdAt),
    publicKey: dto.publicKey,
    name: dto.name,
    updatedAt: new Date(dto.updatedAt),
  };
}

export function organizationQueryOptions(
  accessToken: string,
  organizationKey: string,
) {
  return queryOptions({
    queryKey: organizationKeys.detail(organizationKey),
    queryFn: async () =>
      toOrganization(await getOrganization(accessToken, organizationKey)),
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
  organizationKey: string,
) {
  const queryClient = useQueryClient();
  const query = useQuery(
    organizationQueryOptions(accessToken, organizationKey),
  );
  const mutation = useMutation({
    mutationFn: async (name: string) =>
      toOrganization(
        await updateOrganization(accessToken, organizationKey, { name }),
      ),
    onSuccess: (organization) => {
      queryClient.setQueryData(
        organizationKeys.detail(organizationKey),
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

export function useUpdateOrganization(accessToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      organizationKey,
    }: {
      readonly name: string;
      readonly organizationKey: string;
    }) =>
      toOrganization(
        await updateOrganization(accessToken, organizationKey, { name }),
      ),
    onSuccess: (organization) => {
      queryClient.setQueryData(
        organizationKeys.detail(organization.publicKey),
        organization,
      );
    },
  });
}
