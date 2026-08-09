import { request } from '@/shared/api';

export interface ProjectDto {
  readonly createdAt: string;
  readonly id: string;
  readonly name: string;
  readonly organizationId: string;
  readonly publicKey: string;
  readonly updatedAt: string;
}

export interface ProjectSummaryDto extends ProjectDto {
  readonly featureCount: number;
}

export interface UpdateProjectDto {
  readonly name: string;
}

export function getProjects(
  accessToken: string,
  organizationId: string,
): Promise<readonly ProjectSummaryDto[]> {
  return request<readonly ProjectSummaryDto[]>(
    `/organizations/${organizationId}/projects`,
    { accessToken },
  );
}

export function getProject(
  accessToken: string,
  projectIdentifier: string,
): Promise<ProjectDto> {
  return request<ProjectDto>(`/projects/${projectIdentifier}`, { accessToken });
}

export function updateProject(
  accessToken: string,
  projectId: string,
  input: UpdateProjectDto,
): Promise<ProjectDto> {
  return request<ProjectDto>(`/projects/${projectId}`, {
    accessToken,
    body: input,
    method: 'PATCH',
  });
}
