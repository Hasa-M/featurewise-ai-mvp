import type { ConfigService } from '@nestjs/config';

import type { PrismaService } from '../database/prisma.service';
import type { RepositoryProviderPort } from './ports/repository-provider.port';
import type { RepositoryReaderService } from './repository-reader.service';
import { RepositoryContextService } from './repository-context.service';
import type { CurrentUserContext } from '../auth/current-user-context';

const config = {
  enabled: true,
  appId: '1',
  appSlug: 'featurewise',
  clientId: 'client',
  clientSecret: 'secret',
  privateKey: 'private-key',
  callbackUrl: 'http://localhost:3000/integrations/github/callback',
  frontendBaseUrl: 'http://localhost:5173',
};

function createFixture(attemptOverrides: Record<string, unknown> = {}) {
  const attempt = {
    id: 'attempt-id',
    status: 'pending',
    expiresAt: new Date(Date.now() + 60_000),
    project: { publicNumber: 2 },
    ...attemptOverrides,
  };
  const gitHubConnectionAttempt = {
    findUnique: jest.fn().mockResolvedValue(attempt),
    update: jest.fn().mockResolvedValue(attempt),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const provider = {
    createInstallationUrl: jest
      .fn()
      .mockImplementation((state: string) =>
        Promise.resolve(`https://github.test/install?state=${state}`),
      ),
    createUserAuthorizationUrl: jest
      .fn()
      .mockResolvedValue('https://github.test/login/oauth/authorize'),
    verifyUserInstallation: jest
      .fn()
      .mockResolvedValue([
        { installationId: '9007199254740993', accountLogin: 'owner' },
      ]),
  };
  const prisma = { gitHubConnectionAttempt };
  const service = new RepositoryContextService(
    prisma as unknown as PrismaService,
    {
      getOrThrow: jest.fn().mockReturnValue(config),
    } as unknown as ConfigService,
    {} as RepositoryReaderService,
    provider as unknown as RepositoryProviderPort,
  );
  return { attempt, gitHubConnectionAttempt, provider, service };
}

describe('RepositoryContextService GitHub callback', () => {
  it('authorizes an existing installation without an installation redirect', async () => {
    const fixture = createFixture();
    const url = await fixture.service.handleCallback({
      code: 'code',
      state: 'state',
    });
    expect(url).toBe('http://localhost:5173/projects/PRJ-2?tab=repository');
    expect(fixture.provider.verifyUserInstallation).toHaveBeenCalledWith(
      'code',
      undefined,
    );
  });

  it('returns an actionable install state when the user has no installation', async () => {
    const fixture = createFixture();
    fixture.provider.verifyUserInstallation.mockResolvedValueOnce([]);
    const url = await fixture.service.handleCallback({
      code: 'code',
      state: 'state',
    });
    expect(url).toContain('githubError=installation_required');
    expect(
      (
        fixture.gitHubConnectionAttempt.updateMany.mock.lastCall as
          | readonly unknown[]
          | undefined
      )?.[0],
    ).toMatchObject({
      data: { status: 'failed' },
    });
  });

  it('finishes a denied OAuth attempt without restarting authorization', async () => {
    const fixture = createFixture();
    expect(
      await fixture.service.handleCallback({
        state: 'state',
        error: 'access_denied',
      }),
    ).toContain('githubError=authorization_denied');
    expect(fixture.provider.createUserAuthorizationUrl).not.toHaveBeenCalled();
    expect(fixture.provider.verifyUserInstallation).not.toHaveBeenCalled();
  });

  it('does not revive an attempt cancelled during the OAuth exchange', async () => {
    const fixture = createFixture();
    fixture.gitHubConnectionAttempt.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    expect(
      await fixture.service.handleCallback({ state: 'state', code: 'code' }),
    ).toContain('githubError=expired_or_replayed');
  });

  it('retains every verified account for explicit installation selection', async () => {
    const fixture = createFixture();
    const installations = [
      { installationId: '1', accountLogin: 'personal' },
      { installationId: '2', accountLogin: 'organization' },
    ];
    fixture.provider.verifyUserInstallation.mockResolvedValueOnce(
      installations,
    );
    await fixture.service.handleCallback({ state: 'state', code: 'code' });
    expect(
      (
        fixture.gitHubConnectionAttempt.updateMany.mock.lastCall as
          | readonly unknown[]
          | undefined
      )?.[0],
    ).toMatchObject({
      data: {
        verifiedInstallationId: null,
        verifiedInstallations: installations,
      },
    });
  });

  it('starts transient OAuth after the installation setup redirect', async () => {
    const fixture = createFixture();
    const url = await fixture.service.handleCallback({
      state: 'opaque-state',
      installationId: '9007199254740993',
    });

    expect(url).toBe('https://github.test/login/oauth/authorize');
    expect(fixture.provider.createUserAuthorizationUrl).toHaveBeenCalledWith(
      'opaque-state',
    );
    expect(fixture.gitHubConnectionAttempt.updateMany).not.toHaveBeenCalled();
  });

  it('claims state once, verifies installation visibility, and stores BigInt exactly', async () => {
    const fixture = createFixture();
    const url = await fixture.service.handleCallback({
      code: 'transient-code',
      state: 'opaque-state',
      installationId: '9007199254740993',
    });

    expect(fixture.provider.verifyUserInstallation).toHaveBeenCalledWith(
      'transient-code',
      '9007199254740993',
    );
    expect(fixture.gitHubConnectionAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest asymmetric matchers are intentionally typed as any.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          status: 'verified',
          verifiedInstallationId: 9007199254740993n,
          verifiedInstallations: [
            { installationId: '9007199254740993', accountLogin: 'owner' },
          ],
        }),
      }),
    );
    expect(url).toBe('http://localhost:5173/projects/PRJ-2?tab=repository');
  });

  it('rejects replay before exchanging an OAuth code', async () => {
    const fixture = createFixture({ status: 'verified' });
    const url = await fixture.service.handleCallback({
      code: 'must-not-be-used',
      state: 'opaque-state',
      installationId: '42',
    });

    expect(url).toContain('githubError=expired_or_replayed');
    expect(fixture.provider.verifyUserInstallation).not.toHaveBeenCalled();
  });

  it('does not persist a spoofed installation when GitHub verification fails', async () => {
    const fixture = createFixture();
    fixture.provider.verifyUserInstallation.mockRejectedValueOnce(
      new Error('forbidden'),
    );
    const url = await fixture.service.handleCallback({
      code: 'transient-code',
      state: 'opaque-state',
      installationId: '42',
    });

    expect(url).toContain('githubError=authorization_failed');
    expect(fixture.gitHubConnectionAttempt.update).not.toHaveBeenCalled();
    expect(fixture.gitHubConnectionAttempt.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        // Jest asymmetric matchers are intentionally typed as any.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });
});

describe('RepositoryContextService configuration concurrency', () => {
  const currentUser: CurrentUserContext = {
    organizationId: '00000000-0000-4000-8000-000000000001',
    organizationKey: 'ORG-1',
    projectId: '00000000-0000-4000-8000-000000000002',
    projectKey: 'PRJ-1',
    userId: '00000000-0000-4000-8000-000000000003',
    userKey: 'USR-1',
    username: 'operator',
  };
  const connection = {
    id: '00000000-0000-4000-8000-000000000004',
    publicNumber: 1,
    projectId: currentUser.projectId,
    installationId: 10n,
    repositoryId: 20n,
    owner: 'featurewise',
    name: 'private',
    fullName: 'featurewise/private',
    private: true,
    defaultBranch: 'main',
    baseBranch: 'main',
    configurationVersion: 1,
    status: 'connected',
    lastCheckedAt: new Date(),
    rateLimitResetAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function configurationFixture(updateCount = 1) {
    const projectRepositoryConnection = {
      findUnique: jest.fn().mockResolvedValue(connection),
      updateMany: jest.fn().mockResolvedValue({ count: updateCount }),
      update: jest.fn().mockResolvedValue({
        ...connection,
        baseBranch: 'release',
        configurationVersion: 2,
      }),
    };
    const prisma = {
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: currentUser.projectId,
          publicNumber: 1,
        }),
      },
      projectRepositoryConnection,
      featureRepositoryContext: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const reader = {
      resolveRevision: jest.fn().mockResolvedValue({
        branch: 'release',
        revision: { commitSha: 'a'.repeat(40), treeSha: 'b'.repeat(40) },
        directoryCache: new Map(),
        blobCache: new Map(),
      }),
      validateSelectedPaths: jest.fn(),
    };
    const provider = {
      getRepository: jest.fn().mockResolvedValue({
        repositoryId: '20',
        owner: connection.owner,
        name: connection.name,
        fullName: connection.fullName,
        private: connection.private,
        defaultBranch: connection.defaultBranch,
      }),
    };
    const service = new RepositoryContextService(
      prisma as unknown as PrismaService,
      {
        getOrThrow: jest.fn().mockReturnValue(config),
      } as unknown as ConfigService,
      reader as unknown as RepositoryReaderService,
      provider as unknown as RepositoryProviderPort,
    );
    return { projectRepositoryConnection, reader, service };
  }

  it('resolves a new base branch even when no Feature inherits it', async () => {
    const fixture = configurationFixture();

    await fixture.service.updateBaseBranch(currentUser, 'PRJ-1', 'release');

    expect(fixture.reader.resolveRevision).toHaveBeenCalledWith(
      expect.any(Object),
      'release',
    );
    expect(fixture.projectRepositoryConnection.updateMany).toHaveBeenCalledWith(
      {
        where: { id: connection.id, configurationVersion: 1 },
        data: {
          baseBranch: 'release',
          configurationVersion: { increment: 1 },
        },
      },
    );
  });

  it('rejects a real concurrent base-branch change through configurationVersion', async () => {
    const fixture = configurationFixture(0);

    await expect(
      fixture.service.updateBaseBranch(currentUser, 'PRJ-1', 'release'),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('allows health metadata refreshes but rejects a changed configuration version at capture finalization', async () => {
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      feature: { findFirst: jest.fn().mockResolvedValue({ id: 'feature-id' }) },
      projectRepositoryConnection: {
        findUnique: jest.fn().mockResolvedValue({
          ...connection,
          updatedAt: new Date(connection.updatedAt.getTime() + 10_000),
        }),
      },
      featureRepositoryContext: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const fixture = configurationFixture();
    const token = {
      featureId: '00000000-0000-4000-8000-000000000005',
      projectId: currentUser.projectId,
      connectionId: connection.id,
      configurationVersion: 1,
      contextUpdatedAt: null,
      branchOverride: null,
      selectedPaths: [],
    };

    await expect(
      fixture.service.assertFeatureRepositoryRevisionConsistency(
        transaction as never,
        currentUser,
        token,
      ),
    ).resolves.toBeUndefined();

    transaction.projectRepositoryConnection.findUnique.mockResolvedValueOnce({
      ...connection,
      configurationVersion: 2,
    });
    await expect(
      fixture.service.assertFeatureRepositoryRevisionConsistency(
        transaction as never,
        currentUser,
        token,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});
