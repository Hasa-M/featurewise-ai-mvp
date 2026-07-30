import { request } from '@/shared/api';

export interface ProjectDto {
  readonly createdAt: string;
  readonly id: string;
  readonly name: string;
  readonly organizationId: string;
  readonly updatedAt: string;
}

export interface UpdateProjectDto {
  readonly name: string;
}

export function getProjects(
  accessToken: string,
  organizationId: string,
): Promise<readonly ProjectDto[]> {
  return request<readonly ProjectDto[]>(
    `/organizations/${organizationId}/projects`,
    { accessToken },
  );
}

export function getProject(
  accessToken: string,
  projectId: string,
): Promise<ProjectDto> {
  return request<ProjectDto>(`/projects/${projectId}`, { accessToken });
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
