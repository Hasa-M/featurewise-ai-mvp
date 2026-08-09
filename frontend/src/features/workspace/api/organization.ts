import { request } from '@/shared/api';

export interface OrganizationDto {
  readonly createdAt: string;
  readonly publicKey: string;
  readonly name: string;
  readonly updatedAt: string;
}

export interface UpdateOrganizationDto {
  readonly name: string;
}

export function getOrganization(
  accessToken: string,
  organizationKey: string,
): Promise<OrganizationDto> {
  return request<OrganizationDto>(`/organizations/${organizationKey}`, {
    accessToken,
  });
}

export function updateOrganization(
  accessToken: string,
  organizationKey: string,
  input: UpdateOrganizationDto,
): Promise<OrganizationDto> {
  return request<OrganizationDto>(`/organizations/${organizationKey}`, {
    accessToken,
    body: input,
    method: 'PATCH',
  });
}
