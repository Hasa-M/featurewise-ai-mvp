export const REPOSITORY_PROVIDER_PORT = Symbol('REPOSITORY_PROVIDER_PORT');

export interface ProviderPage<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly hasNextPage: boolean;
}

export interface ProviderRepository {
  readonly repositoryId: string;
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
  readonly private: boolean;
  readonly defaultBranch: string;
}

export interface ProviderBranch {
  readonly name: string;
  readonly commitSha: string;
}

export interface ProviderInstallation {
  readonly installationId: string;
  readonly accountLogin: string;
}

export interface ProviderRevision {
  readonly commitSha: string;
  readonly treeSha: string;
}

export interface ProviderTreeEntry {
  readonly path: string;
  readonly mode: string;
  readonly type: 'blob' | 'commit' | 'tree';
  readonly sha: string;
  readonly sizeBytes: number | null;
}

export interface ProviderTree {
  readonly entries: readonly ProviderTreeEntry[];
  readonly truncated: boolean;
}

export interface ProviderBlob {
  readonly bytes: Uint8Array;
  readonly sha: string;
  readonly sizeBytes: number;
}

export type RepositoryProviderErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'unavailable';

export class RepositoryProviderError extends Error {
  constructor(
    readonly kind: RepositoryProviderErrorKind,
    message: string,
    readonly retryAt: Date | null = null,
  ) {
    super(message);
    this.name = RepositoryProviderError.name;
  }
}

export interface RepositoryProviderPort {
  createInstallationUrl(state: string): Promise<string>;
  createUserAuthorizationUrl(
    state: string,
    installationId?: string,
  ): Promise<string>;
  verifyUserInstallation(
    code: string,
    installationId?: string,
  ): Promise<readonly ProviderInstallation[]>;
  listRepositories(
    installationId: string,
    page: number,
    pageSize: number,
  ): Promise<ProviderPage<ProviderRepository>>;
  getRepository(
    installationId: string,
    repositoryId: string,
  ): Promise<ProviderRepository>;
  listBranches(
    installationId: string,
    repository: ProviderRepository,
    page: number,
    pageSize: number,
  ): Promise<ProviderPage<ProviderBranch>>;
  resolveRevision(
    installationId: string,
    repository: ProviderRepository,
    branch: string,
  ): Promise<ProviderRevision>;
  getTree(
    installationId: string,
    repository: ProviderRepository,
    treeSha: string,
    recursive: boolean,
  ): Promise<ProviderTree>;
  getBlob(
    installationId: string,
    repository: ProviderRepository,
    blobSha: string,
  ): Promise<ProviderBlob>;
}
