/* eslint-disable @typescript-eslint/require-await -- Fixture ports preserve asynchronous rejection semantics without external I/O. */
import { createHash } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import type { RepositoryProviderPort } from '../src/repository-context';
import { RepositoryProviderError } from '../src/repository-context';
import { StorageService } from '../src/storage/storage.service';

export const fileBytes = Buffer.from(
  'Harness supporting context: changes must preserve saved specifications.\n',
);
export const fileChecksum = createHash('sha256')
  .update(fileBytes)
  .digest('base64');
export const repositoryFiles = {
  'README.md':
    '# Harness repository\nFeature specifications are canonical user-authored input.\n',
  'feature.ts': 'export const specificationMustPersist = true;\n',
};
export const fixtureRepository = {
  repositoryId: '101',
  owner: 'harness',
  name: 'fixture',
  fullName: 'harness/fixture',
  private: true,
  defaultBranch: 'main',
};
const sha = (text: string) => createHash('sha1').update(text).digest('hex');
export const fixtureCommit = sha('harness-commit-v1');

export class FixtureRepositoryProvider implements RepositoryProviderPort {
  failure: RepositoryProviderError | null = null;
  beforeResolve: (() => Promise<void>) | null = null;
  private check() {
    if (this.failure) throw this.failure;
  }
  async createInstallationUrl(state: string) {
    return this.createUserAuthorizationUrl(state);
  }
  async createUserAuthorizationUrl(state: string) {
    return `http://127.0.0.1:3100/integrations/github/callback?code=harness&state=${encodeURIComponent(state)}`;
  }
  async verifyUserInstallation() {
    this.check();
    return [{ installationId: '100', accountLogin: 'harness' }];
  }
  async listRepositories(
    _installation: string,
    page: number,
    pageSize: number,
  ) {
    this.check();
    return {
      items: page === 1 ? [fixtureRepository] : [],
      page,
      pageSize,
      hasNextPage: false,
    };
  }
  async getRepository(_installation: string, repositoryId: string) {
    this.check();
    if (repositoryId !== '101')
      throw new RepositoryProviderError(
        'not_found',
        'Unknown fixture repository',
      );
    return fixtureRepository;
  }
  async listBranches(
    _installation: string,
    _repository: unknown,
    page: number,
    pageSize: number,
  ) {
    this.check();
    return {
      items: page === 1 ? [{ name: 'main', commitSha: fixtureCommit }] : [],
      page,
      pageSize,
      hasNextPage: false,
    };
  }
  async resolveRevision(
    _installation: string,
    _repository: unknown,
    branch: string,
  ) {
    this.check();
    if (branch !== 'main')
      throw new RepositoryProviderError('not_found', 'Unknown fixture branch');
    await this.beforeResolve?.();
    return { commitSha: fixtureCommit, treeSha: sha('tree') };
  }
  async getTree() {
    this.check();
    return {
      truncated: false,
      entries: Object.entries(repositoryFiles).map(([path, content]) => ({
        path,
        mode: '100644',
        type: 'blob' as const,
        sha: sha(content),
        sizeBytes: Buffer.byteLength(content),
      })),
    };
  }
  async getBlob(_installation: string, _repository: unknown, blobSha: string) {
    this.check();
    const text = Object.values(repositoryFiles).find(
      (content) => sha(content) === blobSha,
    );
    if (text === undefined)
      throw new RepositoryProviderError('not_found', 'Unknown fixture blob');
    return {
      bytes: Buffer.from(text),
      sha: blobSha,
      sizeBytes: Buffer.byteLength(text),
    };
  }
}

/** All network methods are overridden; deterministic mode cannot fall through to AWS. */
export class FixtureStorageService extends StorageService {
  private unavailable(): never {
    throw new ServiceUnavailableException(
      'Use live mode for storage transport; deterministic mode supplies captured fixture bytes only',
    );
  }
  override async createUpload(): Promise<never> {
    return this.unavailable();
  }
  override async headObject(): Promise<never> {
    return this.unavailable();
  }
  override async copyObject(): Promise<never> {
    return this.unavailable();
  }
  override async putObject(): Promise<never> {
    return this.unavailable();
  }
  override async createAccessUrl(): Promise<never> {
    return this.unavailable();
  }
  override async deleteObject(): Promise<void> {
    /* Fixture metadata cleanup has no external objects. */
  }
  override async getObjectBytes(
    key: string,
    versionId?: string | null,
  ): Promise<Buffer> {
    if (
      !/^harness\/fixtures\/[a-z-]+\/(original|prepared)$/.test(key) ||
      versionId !== 'fixture-v1'
    ) {
      throw new ServiceUnavailableException('Unknown fixture object version');
    }
    return Buffer.from(fileBytes);
  }
}
