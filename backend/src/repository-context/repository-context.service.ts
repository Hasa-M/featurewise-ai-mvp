import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ProjectRepositoryConnection } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';

import type { CurrentUserContext } from '../auth/current-user-context';
import { formatPublicKey, parsePublicKey } from '../common/public-identifiers';
import type { GitHubConfig } from '../config/github.config';
import { PrismaService } from '../database/prisma.service';
import type {
  ConnectRepositoryDto,
  UpdateFeatureRepositoryContextDto,
} from './dto/repository-context.dto';
import {
  MAX_SELECTED_FILE_BYTES,
  classifyTreeEntry,
  validateTextBlob,
} from './repository-file-policy';
import {
  RepositoryReaderService,
  type CapturedRepositoryRevision,
  type RepositoryConnectionInput,
  type RepositoryPathImpact,
} from './repository-reader.service';
import {
  REPOSITORY_PROVIDER_PORT,
  RepositoryProviderError,
  type ProviderRepository,
  type RepositoryProviderPort,
} from './ports/repository-provider.port';

const ATTEMPT_TTL_MS = 10 * 60 * 1000;

export interface RepositoryCaptureConsistencyToken {
  readonly featureId: string;
  readonly projectId: string;
  readonly connectionId: string | null;
  readonly configurationVersion: number | null;
  readonly contextUpdatedAt: string | null;
  readonly branchOverride: string | null;
  readonly selectedPaths: readonly string[];
}

export interface PreparedFeatureRepositoryRevision {
  readonly revision: CapturedRepositoryRevision | null;
  readonly consistencyToken: RepositoryCaptureConsistencyToken;
}

@Injectable()
export class RepositoryContextService {
  private readonly config: GitHubConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly reader: RepositoryReaderService,
    @Inject(REPOSITORY_PROVIDER_PORT)
    private readonly provider: RepositoryProviderPort,
  ) {
    this.config = this.configService.getOrThrow<GitHubConfig>('github');
  }

  async createAttempt(currentUser: CurrentUserContext, projectKey: string) {
    this.requireEnabled();
    const project = await this.resolveProject(currentUser, projectKey);
    const state = randomBytes(32).toString('base64url');
    const stateDigest = this.digestState(state);
    const expiresAt = new Date(Date.now() + ATTEMPT_TTL_MS);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.gitHubConnectionAttempt.updateMany({
        where: {
          projectId: project.id,
          userId: currentUser.userId,
          status: { in: ['pending', 'verifying', 'verified'] },
        },
        data: { status: 'expired', failedAt: new Date() },
      });
      await transaction.gitHubConnectionAttempt.create({
        data: {
          projectId: project.id,
          userId: currentUser.userId,
          stateDigest,
          expiresAt,
        },
      });
    });
    return {
      installationUrl: await this.provider.createInstallationUrl(state),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async handleCallback(input: {
    code?: string;
    state?: string;
    installationId?: string;
  }): Promise<string> {
    if (
      !this.config.enabled ||
      !input.state ||
      !input.installationId ||
      !/^[1-9][0-9]*$/.test(input.installationId)
    ) {
      return this.frontendUrl('/', 'githubError', 'invalid_callback');
    }
    const digest = this.digestState(input.state);
    const attempt = await this.prisma.gitHubConnectionAttempt.findUnique({
      where: { stateDigest: digest },
      include: { project: { select: { publicNumber: true } } },
    });
    if (!attempt) return this.frontendUrl('/', 'githubError', 'invalid_state');
    const projectPath = `/projects/${formatPublicKey('project', attempt.project.publicNumber)}`;
    if (attempt.status !== 'pending' || attempt.expiresAt <= new Date()) {
      if (attempt.status === 'pending')
        await this.prisma.gitHubConnectionAttempt.update({
          where: { id: attempt.id },
          data: { status: 'expired', failedAt: new Date() },
        });
      return this.frontendUrl(
        projectPath,
        'githubError',
        'expired_or_replayed',
      );
    }
    if (!input.code) {
      try {
        return await this.provider.createUserAuthorizationUrl(
          input.state,
          input.installationId,
        );
      } catch {
        return this.frontendUrl(
          projectPath,
          'githubError',
          'authorization_failed',
        );
      }
    }
    const claimed = await this.prisma.gitHubConnectionAttempt.updateMany({
      where: { id: attempt.id, status: 'pending' },
      data: { status: 'verifying' },
    });
    if (claimed.count !== 1)
      return this.frontendUrl(projectPath, 'githubError', 'replayed');
    try {
      await this.provider.verifyUserInstallation(
        input.code,
        input.installationId,
      );
      await this.prisma.gitHubConnectionAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'verified',
          verifiedInstallationId: BigInt(input.installationId),
          verifiedAt: new Date(),
        },
      });
      return this.frontendUrl(projectPath);
    } catch {
      await this.prisma.gitHubConnectionAttempt.updateMany({
        where: { id: attempt.id, status: 'verifying' },
        data: { status: 'failed', failedAt: new Date() },
      });
      return this.frontendUrl(
        projectPath,
        'githubError',
        'authorization_failed',
      );
    }
  }

  async getProjectRepository(
    currentUser: CurrentUserContext,
    projectKey: string,
  ) {
    const project = await this.resolveProject(currentUser, projectKey);
    if (!this.config.enabled) return { state: 'integration_disabled' as const };
    const connection = await this.prisma.projectRepositoryConnection.findUnique(
      { where: { projectId: project.id } },
    );
    if (!connection) {
      const attempt = await this.prisma.gitHubConnectionAttempt.findFirst({
        where: {
          projectId: project.id,
          userId: currentUser.userId,
          status: { in: ['pending', 'verifying', 'verified'] },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (attempt && attempt.expiresAt > new Date())
        return {
          state:
            attempt.status === 'verified'
              ? ('repository_selection' as const)
              : ('connecting' as const),
          attemptExpiresAt: attempt.expiresAt.toISOString(),
        };
      return { state: 'disconnected' as const };
    }
    return this.refreshConnection(connection);
  }

  async listAvailableRepositories(
    currentUser: CurrentUserContext,
    projectKey: string,
    page: number,
    pageSize: number,
  ) {
    const project = await this.resolveProject(currentUser, projectKey);
    const attempt = await this.requireVerifiedAttempt(
      project.id,
      currentUser.userId,
    );
    return this.provider.listRepositories(
      String(attempt.verifiedInstallationId),
      page,
      pageSize,
    );
  }

  async connectRepository(
    currentUser: CurrentUserContext,
    projectKey: string,
    dto: ConnectRepositoryDto,
  ) {
    const project = await this.resolveProject(currentUser, projectKey);
    const attempt = await this.requireVerifiedAttempt(
      project.id,
      currentUser.userId,
    );
    const installationId = String(attempt.verifiedInstallationId);
    const repository = await this.provider.getRepository(
      installationId,
      dto.repositoryId,
    );
    const created = await this.prisma.$transaction(async (transaction) => {
      const current = await transaction.gitHubConnectionAttempt.findUnique({
        where: { id: attempt.id },
      });
      if (
        !current ||
        current.status !== 'verified' ||
        current.expiresAt <= new Date()
      )
        throw new ConflictException(
          'GitHub connection attempt changed; reconnect',
        );
      const connection = await transaction.projectRepositoryConnection.create({
        data: {
          projectId: project.id,
          installationId: BigInt(installationId),
          repositoryId: BigInt(repository.repositoryId),
          owner: repository.owner,
          name: repository.name,
          fullName: repository.fullName,
          private: repository.private,
          defaultBranch: repository.defaultBranch,
          baseBranch: repository.defaultBranch,
          lastCheckedAt: new Date(),
        },
      });
      await transaction.gitHubConnectionAttempt.update({
        where: { id: attempt.id },
        data: { status: 'consumed', consumedAt: new Date() },
      });
      return connection;
    });
    return this.connectionResponse(created, 'connected');
  }

  async disconnect(
    currentUser: CurrentUserContext,
    projectKey: string,
  ): Promise<void> {
    const project = await this.resolveProject(currentUser, projectKey);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.projectRepositoryConnection.deleteMany({
        where: { projectId: project.id },
      });
      await transaction.gitHubConnectionAttempt.updateMany({
        where: {
          projectId: project.id,
          userId: currentUser.userId,
          status: { in: ['pending', 'verifying', 'verified'] },
        },
        data: { status: 'expired', failedAt: new Date() },
      });
    });
  }

  async listBranches(
    currentUser: CurrentUserContext,
    projectKey: string,
    page: number,
    pageSize: number,
  ) {
    const connection = await this.requireConnection(currentUser, projectKey);
    return this.provider.listBranches(
      String(connection.installationId),
      this.providerRepository(connection),
      page,
      pageSize,
    );
  }

  async listTree(
    currentUser: CurrentUserContext,
    projectKey: string,
    query: {
      branch: string;
      commitSha?: string;
      path: string;
      page: number;
      pageSize: number;
    },
  ) {
    const connection = await this.requireConnection(currentUser, projectKey);
    const input = this.readerConnection(connection);
    const directory = await this.reader.inspectDirectory(
      input,
      query.commitSha ?? query.branch,
      query.path,
    );
    const sorted = [...directory.entries].sort((a, b) =>
      a.path.localeCompare(b.path),
    );
    const visibleEntries = sorted.filter((entry) => {
      const reason = classifyTreeEntry(entry);
      return (
        reason !== 'sensitive' &&
        reason !== 'binary' &&
        reason !== 'generated' &&
        reason !== 'invalid_path'
      );
    });
    const rawPage = visibleEntries.slice(
      (query.page - 1) * query.pageSize,
      query.page * query.pageSize,
    );
    const items: {
      path: string;
      name: string;
      kind: 'directory' | 'file';
      sizeBytes: number | null;
      selectable: boolean;
      disabledReason: string | null;
    }[] = [];
    for (const entry of rawPage) {
      const reason = classifyTreeEntry(entry);
      if (entry.type === 'tree') {
        items.push({
          path: entry.path,
          name: entry.path.split('/').at(-1) ?? entry.path,
          kind: 'directory',
          sizeBytes: null,
          selectable: false,
          disabledReason: null,
        });
        continue;
      }
      if (reason) {
        items.push({
          path: entry.path,
          name: entry.path.split('/').at(-1) ?? entry.path,
          kind: 'file',
          sizeBytes: entry.sizeBytes,
          selectable: false,
          disabledReason: reason,
        });
        continue;
      }
      if (
        entry.sizeBytes === null ||
        entry.sizeBytes > MAX_SELECTED_FILE_BYTES
      ) {
        items.push({
          path: entry.path,
          name: entry.path.split('/').at(-1) ?? entry.path,
          kind: 'file',
          sizeBytes: entry.sizeBytes,
          selectable: false,
          disabledReason: 'file_too_large',
        });
        continue;
      }
      const blob = await this.provider.getBlob(
        String(connection.installationId),
        this.providerRepository(connection),
        entry.sha,
      );
      const validated = validateTextBlob(blob.bytes);
      if (typeof validated === 'string') {
        items.push({
          path: entry.path,
          name: entry.path.split('/').at(-1) ?? entry.path,
          kind: 'file',
          sizeBytes: blob.sizeBytes,
          selectable: false,
          disabledReason: validated,
        });
      } else
        items.push({
          path: entry.path,
          name: entry.path.split('/').at(-1) ?? entry.path,
          kind: 'file',
          sizeBytes: blob.sizeBytes,
          selectable: true,
          disabledReason: null,
        });
    }
    return {
      branch: query.branch,
      commitSha: directory.commitSha,
      path: query.path,
      items,
      page: query.page,
      pageSize: query.pageSize,
      hasNextPage: visibleEntries.length > query.page * query.pageSize,
    };
  }

  async updateBaseBranch(
    currentUser: CurrentUserContext,
    projectKey: string,
    baseBranch: string,
  ) {
    if (!baseBranch.trim())
      throw new BadRequestException('Base branch is required');
    const connection = await this.requireConnection(currentUser, projectKey);
    const contexts = await this.prisma.featureRepositoryContext.findMany({
      where: { connectionId: connection.id, branchOverride: null },
      include: {
        feature: { select: { publicNumber: true } },
        selectedFiles: { select: { path: true }, orderBy: { path: 'asc' } },
      },
    });
    const impacts: {
      featureKey: string;
      paths: readonly { path: string; reason: string }[];
    }[] = [];
    const readerConnection = this.readerConnection(connection);
    const resolved = await this.reader.resolveRevision(
      readerConnection,
      baseBranch,
    );
    for (const context of contexts) {
      const invalidPaths = await this.reader.validateSelectedPaths(
        readerConnection,
        resolved,
        context.selectedFiles.map((file) => file.path),
      );
      if (invalidPaths.length > 0)
        impacts.push({
          featureKey: formatPublicKey('feature', context.feature.publicNumber),
          paths: invalidPaths,
        });
    }
    if (impacts.length)
      throw new ConflictException({
        code: 'REPOSITORY_BRANCH_IMPACT',
        message: 'The branch would invalidate selected Feature files',
        details: { features: impacts },
      });
    if (baseBranch !== connection.baseBranch) {
      const updated = await this.prisma.projectRepositoryConnection.updateMany({
        where: {
          id: connection.id,
          configurationVersion: connection.configurationVersion,
        },
        data: {
          baseBranch,
          configurationVersion: { increment: 1 },
        },
      });
      if (updated.count !== 1) this.throwConfigurationChanged();
    }
    return this.getProjectRepository(currentUser, projectKey);
  }

  async getFeatureContext(currentUser: CurrentUserContext, featureKey: string) {
    const feature = await this.resolveFeature(currentUser, featureKey);
    if (!this.config.enabled)
      return { state: 'integration_disabled' as const, featureKey };
    const connection = await this.prisma.projectRepositoryConnection.findUnique(
      { where: { projectId: feature.projectId } },
    );
    if (!connection) return { state: 'disconnected' as const, featureKey };
    const context = await this.prisma.featureRepositoryContext.findUnique({
      where: { featureId: feature.id },
      include: { selectedFiles: { orderBy: { path: 'asc' } } },
    });
    const branchOverride = context?.branchOverride ?? null;
    const effectiveBranch =
      branchOverride ?? connection.baseBranch ?? connection.defaultBranch;
    const selectedPaths = context?.selectedFiles.map((file) => file.path) ?? [];
    return {
      state: connection.status,
      featureKey,
      repositoryKey: formatPublicKey(
        'projectRepositoryConnection',
        connection.publicNumber,
      ),
      fullName: connection.fullName,
      branchOverride,
      effectiveBranch,
      baseBranch: connection.baseBranch,
      defaultBranch: connection.defaultBranch,
      selectedFiles: selectedPaths.map((path) => ({ path })),
    };
  }

  async updateFeatureContext(
    currentUser: CurrentUserContext,
    featureKey: string,
    dto: UpdateFeatureRepositoryContextDto,
  ) {
    const feature = await this.resolveFeature(currentUser, featureKey);
    const connection = await this.prisma.projectRepositoryConnection.findUnique(
      { where: { projectId: feature.projectId } },
    );
    if (!connection)
      throw new ConflictException('Project has no repository connection');
    const originalContext =
      await this.prisma.featureRepositoryContext.findUnique({
        where: { featureId: feature.id },
        include: {
          selectedFiles: { select: { path: true }, orderBy: { path: 'asc' } },
        },
      });
    const branch =
      dto.branchOverride ?? connection.baseBranch ?? connection.defaultBranch;
    const readerConnection = this.readerConnection(connection);
    const resolved = await this.reader.resolveRevision(
      readerConnection,
      branch,
    );
    const invalidPaths = await this.reader.validateSelectedPaths(
      readerConnection,
      resolved,
      dto.selectedPaths,
    );
    if (invalidPaths.length > 0) this.throwSelectionImpact(invalidPaths);
    await this.prisma.$transaction(async (transaction) => {
      await this.lockRepositoryConfiguration(
        transaction,
        feature.projectId,
        feature.id,
        connection.id,
      );
      const current = await transaction.projectRepositoryConnection.findUnique({
        where: { id: connection.id },
      });
      if (
        !current ||
        current.configurationVersion !== connection.configurationVersion
      )
        this.throwConfigurationChanged();
      const currentContext =
        await transaction.featureRepositoryContext.findUnique({
          where: { featureId: feature.id },
          include: {
            selectedFiles: {
              select: { path: true },
              orderBy: { path: 'asc' },
            },
          },
        });
      if (!this.sameFeatureRepositoryContext(currentContext, originalContext))
        this.throwConfigurationChanged();
      const context = await transaction.featureRepositoryContext.upsert({
        where: { featureId: feature.id },
        create: {
          featureId: feature.id,
          projectId: feature.projectId,
          connectionId: connection.id,
          branchOverride: dto.branchOverride,
        },
        update: { branchOverride: dto.branchOverride },
      });
      await transaction.featureRepositorySelectedFile.deleteMany({
        where: { featureRepositoryContextId: context.id },
      });
      if (dto.selectedPaths.length)
        await transaction.featureRepositorySelectedFile.createMany({
          data: [...new Set(dto.selectedPaths)]
            .sort()
            .map((path) => ({ featureRepositoryContextId: context.id, path })),
        });
    });
    return this.getFeatureContext(currentUser, featureKey);
  }

  async prepareFeatureRepositoryRevision(
    currentUser: CurrentUserContext,
    featureKey: string,
  ): Promise<PreparedFeatureRepositoryRevision> {
    const feature = await this.resolveFeature(currentUser, featureKey);
    const connection = await this.prisma.projectRepositoryConnection.findUnique(
      { where: { projectId: feature.projectId } },
    );
    const context = await this.prisma.featureRepositoryContext.findUnique({
      where: { featureId: feature.id },
      include: {
        selectedFiles: { select: { path: true }, orderBy: { path: 'asc' } },
      },
    });
    const selectedPaths = context?.selectedFiles.map((file) => file.path) ?? [];
    const consistencyToken: RepositoryCaptureConsistencyToken = {
      featureId: feature.id,
      projectId: feature.projectId,
      connectionId: connection?.id ?? null,
      configurationVersion: connection?.configurationVersion ?? null,
      contextUpdatedAt: context?.updatedAt.toISOString() ?? null,
      branchOverride: context?.branchOverride ?? null,
      selectedPaths,
    };
    if (!connection) return { revision: null, consistencyToken };
    const branch =
      context?.branchOverride ??
      connection.baseBranch ??
      connection.defaultBranch;
    return {
      revision: await this.reader.captureRevision(
        this.readerConnection(connection),
        branch,
        selectedPaths,
      ),
      consistencyToken,
    };
  }

  async assertFeatureRepositoryRevisionConsistency(
    transaction: Prisma.TransactionClient,
    currentUser: CurrentUserContext,
    token: RepositoryCaptureConsistencyToken,
  ): Promise<void> {
    await this.lockRepositoryConfiguration(
      transaction,
      token.projectId,
      token.featureId,
      token.connectionId,
    );
    const feature = await transaction.feature.findFirst({
      where: {
        id: token.featureId,
        projectId: token.projectId,
        deletedAt: null,
        project: { organizationId: currentUser.organizationId },
      },
    });
    if (!feature) this.throwConfigurationChanged();
    const connection = await transaction.projectRepositoryConnection.findUnique(
      {
        where: { projectId: token.projectId },
      },
    );
    if (
      (connection?.id ?? null) !== token.connectionId ||
      (connection?.configurationVersion ?? null) !== token.configurationVersion
    )
      this.throwConfigurationChanged();
    const context = await transaction.featureRepositoryContext.findUnique({
      where: { featureId: token.featureId },
      include: {
        selectedFiles: { select: { path: true }, orderBy: { path: 'asc' } },
      },
    });
    const currentPaths = context?.selectedFiles.map((file) => file.path) ?? [];
    if (
      (context !== null && context.connectionId !== token.connectionId) ||
      (context?.updatedAt.toISOString() ?? null) !== token.contextUpdatedAt ||
      (context?.branchOverride ?? null) !== token.branchOverride ||
      currentPaths.length !== token.selectedPaths.length ||
      currentPaths.some((path, index) => path !== token.selectedPaths[index])
    )
      this.throwConfigurationChanged();
  }

  private async lockRepositoryConfiguration(
    transaction: Prisma.TransactionClient,
    projectId: string,
    featureId: string,
    connectionId: string | null,
  ): Promise<void> {
    await transaction.$queryRaw(
      Prisma.sql`SELECT 1 FROM "project" WHERE "project_id" = ${projectId}::uuid FOR UPDATE`,
    );
    await transaction.$queryRaw(
      Prisma.sql`SELECT 1 FROM "feature" WHERE "feature_id" = ${featureId}::uuid FOR UPDATE`,
    );
    if (connectionId)
      await transaction.$queryRaw(
        Prisma.sql`SELECT 1 FROM "project_repository_connection" WHERE "project_repository_connection_id" = ${connectionId}::uuid FOR UPDATE`,
      );
  }

  private sameFeatureRepositoryContext(
    left: {
      readonly connectionId: string;
      readonly branchOverride: string | null;
      readonly updatedAt: Date;
      readonly selectedFiles: readonly { readonly path: string }[];
    } | null,
    right: {
      readonly connectionId: string;
      readonly branchOverride: string | null;
      readonly updatedAt: Date;
      readonly selectedFiles: readonly { readonly path: string }[];
    } | null,
  ): boolean {
    if (left === null || right === null) return left === right;
    const leftPaths = left.selectedFiles.map((file) => file.path);
    const rightPaths = right.selectedFiles.map((file) => file.path);
    return (
      left.connectionId === right.connectionId &&
      left.branchOverride === right.branchOverride &&
      left.updatedAt.getTime() === right.updatedAt.getTime() &&
      leftPaths.length === rightPaths.length &&
      leftPaths.every((path, index) => path === rightPaths[index])
    );
  }

  private throwSelectionImpact(paths: readonly RepositoryPathImpact[]): never {
    throw new ConflictException({
      code: 'REPOSITORY_BRANCH_IMPACT',
      message: 'One or more selected repository files are unavailable',
      details: { paths },
    });
  }

  private throwConfigurationChanged(): never {
    throw new ConflictException({
      code: 'REPOSITORY_CONFIGURATION_CHANGED',
      message: 'Repository configuration changed; retry',
    });
  }

  private async refreshConnection(connection: ProjectRepositoryConnection) {
    try {
      const repository = await this.provider.getRepository(
        String(connection.installationId),
        String(connection.repositoryId),
      );
      const updated = await this.prisma.projectRepositoryConnection.update({
        where: { id: connection.id },
        data: {
          owner: repository.owner,
          name: repository.name,
          fullName: repository.fullName,
          private: repository.private,
          defaultBranch: repository.defaultBranch,
          status: 'connected',
          lastCheckedAt: new Date(),
          rateLimitResetAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
      return this.connectionResponse(updated, 'connected');
    } catch (error) {
      const providerError =
        error instanceof RepositoryProviderError
          ? error
          : new RepositoryProviderError('unavailable', 'GitHub request failed');
      const status =
        providerError.kind === 'rate_limited' ? 'rate_limited' : 'inaccessible';
      const updated = await this.prisma.projectRepositoryConnection.update({
        where: { id: connection.id },
        data: {
          status,
          lastCheckedAt: new Date(),
          rateLimitResetAt: providerError.retryAt,
          lastErrorCode: providerError.kind,
          lastErrorMessage: providerError.message,
        },
      });
      return this.connectionResponse(updated, status);
    }
  }

  private connectionResponse(
    connection: {
      publicNumber: number;
      repositoryId: bigint;
      owner: string;
      name: string;
      fullName: string;
      private: boolean;
      defaultBranch: string;
      baseBranch: string;
      status: string;
      lastCheckedAt: Date | null;
      rateLimitResetAt: Date | null;
      lastErrorCode: string | null;
      lastErrorMessage: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    state: string,
  ) {
    return {
      state,
      connection: {
        publicKey: formatPublicKey(
          'projectRepositoryConnection',
          connection.publicNumber,
        ),
        repositoryId: String(connection.repositoryId),
        owner: connection.owner,
        name: connection.name,
        fullName: connection.fullName,
        private: connection.private,
        defaultBranch: connection.defaultBranch,
        baseBranch: connection.baseBranch,
        status: connection.status,
        lastCheckedAt: connection.lastCheckedAt?.toISOString() ?? null,
        rateLimitResetAt: connection.rateLimitResetAt?.toISOString() ?? null,
        lastErrorCode: connection.lastErrorCode,
        lastErrorMessage: connection.lastErrorMessage,
        createdAt: connection.createdAt.toISOString(),
        updatedAt: connection.updatedAt.toISOString(),
      },
    };
  }

  private providerRepository(connection: {
    repositoryId: bigint;
    owner: string;
    name: string;
    fullName: string;
    private: boolean;
    defaultBranch: string;
  }): ProviderRepository {
    return {
      repositoryId: String(connection.repositoryId),
      owner: connection.owner,
      name: connection.name,
      fullName: connection.fullName,
      private: connection.private,
      defaultBranch: connection.defaultBranch,
    };
  }

  private readerConnection(connection: {
    publicNumber: number;
    installationId: bigint;
    repositoryId: bigint;
    owner: string;
    name: string;
    fullName: string;
    private: boolean;
    defaultBranch: string;
  }): RepositoryConnectionInput {
    return {
      publicKey: formatPublicKey(
        'projectRepositoryConnection',
        connection.publicNumber,
      ),
      installationId: String(connection.installationId),
      repository: this.providerRepository(connection),
    };
  }

  private async resolveProject(
    currentUser: CurrentUserContext,
    projectKey: string,
  ) {
    const publicNumber = parsePublicKey('project', projectKey);
    const project = await this.prisma.project.findFirst({
      where: { publicNumber, organizationId: currentUser.organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async resolveFeature(
    currentUser: CurrentUserContext,
    featureKey: string,
  ) {
    const publicNumber = parsePublicKey('feature', featureKey);
    const feature = await this.prisma.feature.findFirst({
      where: {
        publicNumber,
        deletedAt: null,
        project: { organizationId: currentUser.organizationId },
      },
    });
    if (!feature) throw new NotFoundException('Feature not found');
    return feature;
  }

  private async requireConnection(
    currentUser: CurrentUserContext,
    projectKey: string,
  ) {
    const project = await this.resolveProject(currentUser, projectKey);
    const connection = await this.prisma.projectRepositoryConnection.findUnique(
      { where: { projectId: project.id } },
    );
    if (!connection)
      throw new NotFoundException('Repository connection not found');
    return connection;
  }

  private async requireVerifiedAttempt(projectId: string, userId: string) {
    const attempt = await this.prisma.gitHubConnectionAttempt.findFirst({
      where: { projectId, userId, status: 'verified' },
      orderBy: { createdAt: 'desc' },
    });
    if (
      !attempt ||
      attempt.expiresAt <= new Date() ||
      attempt.verifiedInstallationId === null
    )
      throw new ConflictException(
        'A verified GitHub connection attempt is required',
      );
    return attempt;
  }

  private digestState(state: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash('sha256').update(state).digest());
  }
  private requireEnabled(): void {
    if (!this.config.enabled)
      throw new ConflictException({
        code: 'GITHUB_DISABLED',
        message: 'GitHub integration is disabled',
      });
  }
  private frontendUrl(
    path: string,
    errorName?: string,
    errorValue?: string,
  ): string {
    const url = new URL(
      path,
      `${this.config.frontendBaseUrl || 'http://localhost'}/`,
    );
    if (path.startsWith('/projects/'))
      url.searchParams.set('tab', 'repository');
    if (errorName && errorValue) url.searchParams.set(errorName, errorValue);
    return url.toString();
  }

  throwProviderError(error: unknown): never {
    const providerError =
      error instanceof RepositoryProviderError
        ? error
        : new RepositoryProviderError('unavailable', 'GitHub request failed');
    if (providerError.kind === 'rate_limited')
      throw new HttpException(
        {
          code: 'GITHUB_RATE_LIMITED',
          message: providerError.message,
          retryAt: providerError.retryAt?.toISOString() ?? null,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    if (
      providerError.kind === 'unauthorized' ||
      providerError.kind === 'forbidden'
    )
      throw new HttpException(
        {
          code: 'GITHUB_CONNECTION_INACCESSIBLE',
          message: providerError.message,
        },
        HttpStatus.FAILED_DEPENDENCY,
      );
    if (providerError.kind === 'not_found')
      throw new NotFoundException({
        code: 'GITHUB_NOT_FOUND',
        message: providerError.message,
      });
    if (providerError.kind === 'conflict')
      throw new ConflictException({
        code: 'GITHUB_REPOSITORY_CONFLICT',
        message: providerError.message,
      });
    throw new BadGatewayException({
      code: 'GITHUB_UNAVAILABLE',
      message: providerError.message,
    });
  }
}
