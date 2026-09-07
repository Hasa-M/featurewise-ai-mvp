import { request } from '@/shared/api';

export type RepositoryState =
  | 'integration_disabled'
  | 'disconnected'
  | 'connecting'
  | 'repository_selection'
  | 'connected'
  | 'inaccessible'
  | 'rate_limited';

export interface RepositoryConnectionDto {
  readonly publicKey: string;
  readonly repositoryId: string;
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
  readonly private: boolean;
  readonly defaultBranch: string;
  readonly baseBranch: string;
  readonly status: string;
  readonly lastCheckedAt: string | null;
  readonly rateLimitResetAt: string | null;
  readonly lastErrorCode: string | null;
  readonly lastErrorMessage: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectRepositoryDto {
  readonly githubAppAccessUrl?: string;
  readonly state: RepositoryState;
  readonly connection?: RepositoryConnectionDto;
  readonly attemptExpiresAt?: string;
  readonly installations?: readonly {
    readonly installationId: string;
    readonly accountLogin: string;
  }[];
}

export interface ProviderRepositoryDto {
  readonly repositoryId: string;
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
  readonly private: boolean;
  readonly defaultBranch: string;
}

export interface PageDto<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly hasNextPage: boolean;
}

export interface BranchDto {
  readonly name: string;
  readonly commitSha: string;
}
export interface TreeItemDto {
  readonly path: string;
  readonly name: string;
  readonly kind: 'directory' | 'file';
  readonly sizeBytes: number | null;
  readonly selectable: boolean;
  readonly disabledReason: string | null;
}
export interface TreePageDto extends PageDto<TreeItemDto> {
  readonly branch: string;
  readonly commitSha: string;
  readonly path: string;
}

export interface FeatureRepositoryContextDto {
  readonly state: RepositoryState | 'connected';
  readonly featureKey: string;
  readonly repositoryKey?: string;
  readonly fullName?: string;
  readonly branchOverride?: string | null;
  readonly effectiveBranch?: string;
  readonly baseBranch?: string;
  readonly defaultBranch?: string;
  readonly selectedFiles?: readonly { readonly path: string }[];
}

export const getProjectRepository = (token: string, projectKey: string) =>
  request<ProjectRepositoryDto>(`/projects/${projectKey}/repository`, {
    accessToken: token,
  });
export const createGitHubAttempt = (
  token: string,
  projectKey: string,
  mode: 'authorize' | 'install' = 'authorize',
) =>
  request<{ redirectUrl: string; expiresAt: string }>(
    `/projects/${projectKey}/repository/github/attempts`,
    { accessToken: token, method: 'POST', body: { mode } },
  );
export const cancelGitHubAttempt = (token: string, projectKey: string) =>
  request<void>(`/projects/${projectKey}/repository/github/attempts`, {
    accessToken: token,
    method: 'DELETE',
  });
export const getAvailableRepositories = (
  token: string,
  projectKey: string,
  page: number,
  installationId?: string,
) =>
  request<PageDto<ProviderRepositoryDto>>(
    `/projects/${projectKey}/repository/github/available-repositories?page=${page}&pageSize=100${installationId ? `&installationId=${encodeURIComponent(installationId)}` : ''}`,
    { accessToken: token },
  );
export const connectRepository = (
  token: string,
  projectKey: string,
  repositoryId: string,
  installationId?: string,
) =>
  request<ProjectRepositoryDto>(`/projects/${projectKey}/repository`, {
    accessToken: token,
    method: 'POST',
    body: { repositoryId, installationId },
  });
export const updateBaseBranch = (
  token: string,
  projectKey: string,
  baseBranch: string,
) =>
  request<ProjectRepositoryDto>(`/projects/${projectKey}/repository`, {
    accessToken: token,
    method: 'PATCH',
    body: { baseBranch },
  });
export const disconnectRepository = (token: string, projectKey: string) =>
  request<void>(`/projects/${projectKey}/repository`, {
    accessToken: token,
    method: 'DELETE',
  });
export const getBranches = (token: string, projectKey: string, page: number) =>
  request<PageDto<BranchDto>>(
    `/projects/${projectKey}/repository/branches?page=${page}&pageSize=100`,
    { accessToken: token },
  );
export const getTree = (
  token: string,
  projectKey: string,
  branch: string,
  path: string,
  page: number,
  commitSha?: string,
) => {
  const params = new URLSearchParams({
    branch,
    path,
    page: String(page),
    pageSize: '100',
  });
  if (commitSha) params.set('commitSha', commitSha);
  return request<TreePageDto>(
    `/projects/${projectKey}/repository/tree?${params.toString()}`,
    { accessToken: token },
  );
};
export const getFeatureRepositoryContext = (
  token: string,
  featureKey: string,
) =>
  request<FeatureRepositoryContextDto>(
    `/features/${featureKey}/repository-context`,
    { accessToken: token },
  );
export const updateFeatureRepositoryContext = (
  token: string,
  featureKey: string,
  input: { branchOverride: string | null; selectedPaths: readonly string[] },
) =>
  request<FeatureRepositoryContextDto>(
    `/features/${featureKey}/repository-context`,
    { accessToken: token, method: 'PUT', body: input },
  );
