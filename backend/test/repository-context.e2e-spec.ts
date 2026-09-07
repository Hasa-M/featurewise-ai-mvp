import {
  type CanActivate,
  type ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AuthGuard } from '../src/auth/auth.guard';
import type { AuthenticatedRequest } from '../src/auth/authenticated-request';
import type { CurrentUserContext } from '../src/auth/current-user-context';
import { PrismaService } from '../src/database/prisma.service';
import {
  REPOSITORY_PROVIDER_PORT,
  RepositoryProviderError,
} from '../src/repository-context/ports/repository-provider.port';
import { RepositoryContextController } from '../src/repository-context/repository-context.controller';
import { RepositoryContextService } from '../src/repository-context/repository-context.service';
import { RepositoryReaderService } from '../src/repository-context/repository-reader.service';

const currentUser: CurrentUserContext = {
  organizationId: '00000000-0000-4000-8000-000000000001',
  organizationKey: 'ORG-1',
  projectId: '00000000-0000-4000-8000-000000000002',
  projectKey: 'PRJ-1',
  userId: '00000000-0000-4000-8000-000000000003',
  userKey: 'USR-1',
  username: 'operator',
};

describe('Repository context HTTP flow with a fake GitHub adapter', () => {
  let app: INestApplication<App>;
  let attempt: Record<string, unknown> | null;
  const provider = {
    createInstallationUrl: jest.fn((state: string) =>
      Promise.resolve(
        `https://github.test/apps/featurewise/installations/new?state=${state}`,
      ),
    ),
    createUserAuthorizationUrl: jest
      .fn()
      .mockImplementation((state: string) =>
        Promise.resolve(
          `https://github.test/login/oauth/authorize?state=${state}`,
        ),
      ),
    verifyUserInstallation: jest
      .fn()
      .mockResolvedValue([
        { installationId: '9007199254740995', accountLogin: 'featurewise' },
      ]),
    listRepositories: jest.fn().mockResolvedValue({
      items: [
        {
          repositoryId: '9007199254740993',
          owner: 'featurewise',
          name: 'private',
          fullName: 'featurewise/private',
          private: true,
          defaultBranch: 'main',
        },
      ],
      page: 1,
      pageSize: 50,
      hasNextPage: false,
    }),
  };

  beforeEach(async () => {
    attempt = null;
    jest.clearAllMocks();
    const attemptDelegate = {
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: { status?: string | { in: string[] } };
          data: Record<string, unknown>;
        }) => {
          if (
            attempt &&
            (where.status === undefined ||
              (typeof where.status === 'string'
                ? attempt.status === where.status
                : where.status.in.includes(String(attempt.status))))
          ) {
            Object.assign(attempt, data);
            return Promise.resolve({ count: 1 });
          }
          return Promise.resolve({ count: 0 });
        },
      ),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        attempt = {
          id: 'attempt-1',
          status: 'pending',
          createdAt: new Date(),
          ...data,
        };
        return Promise.resolve(attempt);
      }),
      findUnique: jest.fn(() =>
        Promise.resolve(
          attempt ? { ...attempt, project: { publicNumber: 1 } } : null,
        ),
      ),
      findFirst: jest.fn(() => Promise.resolve(attempt)),
      update: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        if (!attempt) throw new Error('Attempt missing');
        Object.assign(attempt, data);
        return Promise.resolve(attempt);
      }),
    };
    const prisma = {
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: currentUser.projectId,
          publicNumber: 1,
          organizationId: currentUser.organizationId,
        }),
      },
      projectRepositoryConnection: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      gitHubConnectionAttempt: attemptDelegate,
      $transaction: jest.fn(
        <T>(callback: (transaction: unknown) => Promise<T>) => callback(prisma),
      ),
    };
    const guard: CanActivate = {
      canActivate(context: ExecutionContext) {
        context.switchToHttp().getRequest<AuthenticatedRequest>().currentUser =
          currentUser;
        return true;
      },
    };
    const module = await Test.createTestingModule({
      controllers: [RepositoryContextController],
      providers: [
        RepositoryContextService,
        RepositoryReaderService,
        PrismaService,
        {
          provide: REPOSITORY_PROVIDER_PORT,
          useValue: provider,
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => ({
              enabled: true,
              appId: '1',
              appSlug: 'featurewise',
              clientId: 'client',
              clientSecret: 'secret',
              privateKey: 'private',
              callbackUrl: 'http://localhost/integrations/github/callback',
              frontendBaseUrl: 'http://console.test',
            }),
          } satisfies Partial<ConfigService>,
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideGuard(AuthGuard)
      .useValue(guard)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => app.close());

  it('does not create a pending attempt when App permission validation fails', async () => {
    provider.createUserAuthorizationUrl.mockRejectedValueOnce(
      new RepositoryProviderError(
        'conflict',
        'The GitHub App needs Contents: read-only repository permission.',
      ),
    );
    const response = await request(app.getHttpServer())
      .post('/projects/PRJ-1/repository/github/attempts')
      .expect(409);
    expect(response.text).toContain('Contents: read-only');
    expect(attempt).toBeNull();
  });

  it('authorizes an existing installation directly before listing a private repository', async () => {
    const started = await request(app.getHttpServer())
      .post('/projects/PRJ-1/repository/github/attempts')
      .set('Authorization', 'Bearer test')
      .expect(201);
    const startedBody = JSON.parse(started.text) as { redirectUrl: string };
    const installationUrl = new URL(startedBody.redirectUrl);
    const state = installationUrl.searchParams.get('state');
    expect(state).toBeTruthy();
    expect(attempt?.stateDigest).toBeInstanceOf(Uint8Array);
    expect(JSON.stringify(attempt)).not.toContain(state);

    expect(installationUrl.pathname).toBe('/login/oauth/authorize');
    expect(provider.createInstallationUrl).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .get('/integrations/github/callback')
      .query({
        code: 'transient-code',
        state,
      })
      .expect(302)
      .expect('Location', 'http://console.test/projects/PRJ-1?tab=repository');
    expect(attempt?.verifiedInstallationId).toBe(9007199254740995n);
    expect(Object.values(attempt ?? {})).not.toContain('transient-code');

    const repositories = await request(app.getHttpServer())
      .get('/projects/PRJ-1/repository/github/available-repositories')
      .set('Authorization', 'Bearer test')
      .expect(200);
    const repositoryBody = JSON.parse(repositories.text) as {
      items: readonly Record<string, unknown>[];
    };
    expect(repositoryBody.items[0]).toMatchObject({
      repositoryId: '9007199254740993',
      fullName: 'featurewise/private',
      private: true,
    });
  });

  it('offers installation explicitly and resumes OAuth after the setup redirect', async () => {
    const started = await request(app.getHttpServer())
      .post('/projects/PRJ-1/repository/github/attempts')
      .send({ mode: 'install' })
      .expect(201);
    const body = JSON.parse(started.text) as { redirectUrl: string };
    const url = new URL(body.redirectUrl);
    expect(url.pathname).toContain('/installations/new');
    const state = url.searchParams.get('state');
    await request(app.getHttpServer())
      .get('/integrations/github/callback')
      .query({ state, installation_id: '42' })
      .expect(302)
      .expect(
        'Location',
        `https://github.test/login/oauth/authorize?state=${state}`,
      );
    expect(attempt?.status).toBe('pending');
  });

  it('cancels only the attempt and rejects a later callback', async () => {
    await request(app.getHttpServer())
      .post('/projects/PRJ-1/repository/github/attempts')
      .expect(201);
    await request(app.getHttpServer())
      .delete('/projects/PRJ-1/repository/github/attempts')
      .expect(204);
    expect(attempt?.status).toBe('expired');
    await request(app.getHttpServer())
      .get('/integrations/github/callback')
      .query({ state: 'state', code: 'late-code' })
      .expect(302)
      .expect(
        'Location',
        'http://console.test/projects/PRJ-1?tab=repository&githubError=expired_or_replayed',
      );
    expect(provider.verifyUserInstallation).not.toHaveBeenCalled();
  });

  it('rejects an installation ID that was not verified by OAuth', async () => {
    await request(app.getHttpServer())
      .post('/projects/PRJ-1/repository/github/attempts')
      .expect(201);
    if (!attempt) throw new Error('Attempt missing');
    Object.assign(attempt, {
      status: 'verified',
      verifiedInstallationId: null,
      verifiedInstallations: [
        { installationId: '1', accountLogin: 'first' },
        { installationId: '2', accountLogin: 'second' },
      ],
    });
    await request(app.getHttpServer())
      .get('/projects/PRJ-1/repository/github/available-repositories')
      .query({ installationId: '3' })
      .expect(400);
    expect(provider.listRepositories).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .get('/projects/PRJ-1/repository/github/available-repositories')
      .query({ installationId: '2' })
      .expect(200);
    expect(provider.listRepositories).toHaveBeenCalledWith('2', 1, 50);
  });
});
