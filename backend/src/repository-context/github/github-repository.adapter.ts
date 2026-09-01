import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { App } from '@octokit/app';

import type { GitHubConfig } from '../../config/github.config';
import {
  RepositoryProviderError,
  type ProviderBlob,
  type ProviderBranch,
  type ProviderPage,
  type ProviderRepository,
  type ProviderRevision,
  type ProviderTree,
  type RepositoryProviderPort,
} from '../ports/repository-provider.port';

const API_VERSION = '2026-03-10';

type GitHubError = {
  status?: number;
  response?: { headers?: Record<string, string>; data?: { message?: string } };
};

@Injectable()
export class GitHubRepositoryAdapter implements RepositoryProviderPort {
  private readonly config: GitHubConfig;
  private appPromise: Promise<App> | null = null;

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<GitHubConfig>('github');
  }

  async createInstallationUrl(state: string): Promise<string> {
    return (
      await (await this.requireApp()).getInstallationUrl({ state })
    ).toString();
  }

  async createUserAuthorizationUrl(
    state: string,
    installationId: string,
  ): Promise<string> {
    const app = await this.requireApp();
    return app.oauth.getWebFlowAuthorizationUrl({
      state,
      redirectUrl: this.oauthRedirectUrl(installationId),
    }).url;
  }

  async verifyUserInstallation(
    code: string,
    installationId: string,
  ): Promise<void> {
    try {
      const userOctokit = await (
        await this.requireApp()
      ).oauth.getUserOctokit({
        code,
        redirectUrl: this.oauthRedirectUrl(installationId),
      });
      let page = 1;
      for (;;) {
        const response = await userOctokit.request('GET /user/installations', {
          page,
          per_page: 100,
          headers: { 'X-GitHub-Api-Version': API_VERSION },
        });
        if (
          response.data.installations.some(
            (item) => String(item.id) === installationId,
          )
        )
          return;
        if (response.data.installations.length < 100) break;
        page += 1;
      }
      throw new RepositoryProviderError(
        'forbidden',
        'Installation is not visible to the authorizing GitHub user',
      );
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async listRepositories(
    installationId: string,
    page: number,
    pageSize: number,
  ): Promise<ProviderPage<ProviderRepository>> {
    try {
      const octokit = await this.installationOctokit(installationId);
      const response = await octokit.request('GET /installation/repositories', {
        page,
        per_page: pageSize,
        headers: { 'X-GitHub-Api-Version': API_VERSION },
      });
      return {
        items: response.data.repositories.map((repository) =>
          this.toRepository(repository),
        ),
        page,
        pageSize,
        hasNextPage: response.data.repositories.length === pageSize,
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getRepository(
    installationId: string,
    repositoryId: string,
  ): Promise<ProviderRepository> {
    let page = 1;
    for (;;) {
      const result = await this.listRepositories(installationId, page, 100);
      const repository = result.items.find(
        (item) => item.repositoryId === repositoryId,
      );
      if (repository) return repository;
      if (!result.hasNextPage)
        throw new RepositoryProviderError(
          'not_found',
          'Repository is not accessible to the installation',
        );
      page += 1;
    }
  }

  async listBranches(
    installationId: string,
    repository: ProviderRepository,
    page: number,
    pageSize: number,
  ): Promise<ProviderPage<ProviderBranch>> {
    try {
      const octokit = await this.installationOctokit(installationId);
      const response = await octokit.request(
        'GET /repos/{owner}/{repo}/branches',
        {
          owner: repository.owner,
          repo: repository.name,
          page,
          per_page: pageSize,
          headers: { 'X-GitHub-Api-Version': API_VERSION },
        },
      );
      return {
        items: response.data.map((branch) => ({
          name: branch.name,
          commitSha: branch.commit.sha,
        })),
        page,
        pageSize,
        hasNextPage: response.data.length === pageSize,
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async resolveRevision(
    installationId: string,
    repository: ProviderRepository,
    branch: string,
  ): Promise<ProviderRevision> {
    try {
      const octokit = await this.installationOctokit(installationId);
      const response = await octokit.request(
        'GET /repos/{owner}/{repo}/commits/{ref}',
        {
          owner: repository.owner,
          repo: repository.name,
          ref: /^[0-9a-f]{40,64}$/i.test(branch) ? branch : `heads/${branch}`,
          headers: { 'X-GitHub-Api-Version': API_VERSION },
        },
      );
      return {
        commitSha: response.data.sha,
        treeSha: response.data.commit.tree.sha,
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getTree(
    installationId: string,
    repository: ProviderRepository,
    treeSha: string,
    recursive: boolean,
  ): Promise<ProviderTree> {
    try {
      const octokit = await this.installationOctokit(installationId);
      const response = await octokit.request(
        'GET /repos/{owner}/{repo}/git/trees/{tree_sha}',
        {
          owner: repository.owner,
          repo: repository.name,
          tree_sha: treeSha,
          recursive: recursive ? 'true' : undefined,
          headers: { 'X-GitHub-Api-Version': API_VERSION },
        },
      );
      return {
        entries: response.data.tree.flatMap((entry) =>
          entry.path && entry.mode && entry.type && entry.sha
            ? [
                {
                  path: entry.path,
                  mode: entry.mode,
                  type: entry.type as 'blob' | 'commit' | 'tree',
                  sha: entry.sha,
                  sizeBytes: entry.size ?? null,
                },
              ]
            : [],
        ),
        truncated: response.data.truncated,
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getBlob(
    installationId: string,
    repository: ProviderRepository,
    blobSha: string,
  ): Promise<ProviderBlob> {
    try {
      const octokit = await this.installationOctokit(installationId);
      const response = await octokit.request(
        'GET /repos/{owner}/{repo}/git/blobs/{file_sha}',
        {
          owner: repository.owner,
          repo: repository.name,
          file_sha: blobSha,
          headers: { 'X-GitHub-Api-Version': API_VERSION },
        },
      );
      if (response.data.encoding !== 'base64')
        throw new RepositoryProviderError(
          'unavailable',
          'GitHub returned an unsupported blob encoding',
        );
      const bytes = Buffer.from(
        response.data.content.replace(/\s/g, ''),
        'base64',
      );
      return {
        bytes,
        sha: response.data.sha,
        sizeBytes: response.data.size ?? bytes.byteLength,
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private requireApp(): Promise<App> {
    if (!this.config.enabled)
      throw new RepositoryProviderError(
        'unavailable',
        'GitHub integration is disabled',
      );
    this.appPromise ??= import('@octokit/app').then(
      ({ App }) =>
        new App({
          appId: this.config.appId,
          privateKey: this.config.privateKey,
          oauth: {
            clientId: this.config.clientId,
            clientSecret: this.config.clientSecret,
          },
          log: { debug() {}, info() {}, warn() {}, error() {} },
        }),
    );
    return this.appPromise;
  }

  private async installationOctokit(installationId: string) {
    const id = Number(installationId);
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new RepositoryProviderError(
        'unavailable',
        'GitHub installation identifier is invalid',
      );
    return (await this.requireApp()).getInstallationOctokit(id);
  }

  private oauthRedirectUrl(installationId: string): string {
    const url = new URL(this.config.callbackUrl);
    url.searchParams.set('installation_id', installationId);
    return url.toString();
  }

  private toRepository(repository: {
    id: number | bigint;
    owner: { login: string } | null;
    name: string;
    full_name: string;
    private: boolean;
    default_branch: string | null;
  }): ProviderRepository {
    if (!repository.owner || !repository.default_branch)
      throw new RepositoryProviderError(
        'conflict',
        'Repository metadata is incomplete',
      );
    return {
      repositoryId: String(repository.id),
      owner: repository.owner.login,
      name: repository.name,
      fullName: repository.full_name,
      private: repository.private,
      defaultBranch: repository.default_branch,
    };
  }

  private mapError(error: unknown): RepositoryProviderError {
    if (error instanceof RepositoryProviderError) return error;
    const githubError = error as GitHubError;
    const status = githubError.status;
    const headers = githubError.response?.headers ?? {};
    const rateLimited =
      status === 429 ||
      (status === 403 && headers['x-ratelimit-remaining'] === '0');
    if (rateLimited) {
      const retryAfter = Number(headers['retry-after']);
      const reset = Number(headers['x-ratelimit-reset']);
      const retryAt = Number.isFinite(retryAfter)
        ? new Date(Date.now() + retryAfter * 1000)
        : Number.isFinite(reset)
          ? new Date(reset * 1000)
          : null;
      return new RepositoryProviderError(
        'rate_limited',
        'GitHub rate limit reached',
        retryAt,
      );
    }
    const kind =
      status === 401
        ? 'unauthorized'
        : status === 403
          ? 'forbidden'
          : status === 404
            ? 'not_found'
            : status === 409
              ? 'conflict'
              : 'unavailable';
    return new RepositoryProviderError(
      kind,
      `GitHub request failed${status ? ` (${status})` : ''}`,
    );
  }
}
