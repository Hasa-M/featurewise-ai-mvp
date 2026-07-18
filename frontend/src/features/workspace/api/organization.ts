import { request } from '@/shared/api';

export interface OrganizationDto {
  readonly createdAt: string;
  readonly id: string;
  readonly name: string;
  readonly updatedAt: string;
}

export interface UpdateOrganizationDto {
  readonly name: string;
}

export function getOrganization(
  accessToken: string,
  organizationId: string,
): Promise<OrganizationDto> {
  return request<OrganizationDto>(`/organizations/${organizationId}`, {
    accessToken,
  });
}

export function updateOrganization(
  accessToken: string,
  organizationId: string,
  input: UpdateOrganizationDto,
): Promise<OrganizationDto> {
  return request<OrganizationDto>(`/organizations/${organizationId}`, {
    accessToken,
    body: input,
    method: 'PATCH',
  });
}
