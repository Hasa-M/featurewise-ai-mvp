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
import { REPOSITORY_PROVIDER_PORT } from '../src/repository-context/ports/repository-provider.port';
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
      .mockResolvedValue('https://github.test/login/oauth/authorize'),
    verifyUserInstallation: jest.fn().mockResolvedValue(undefined),
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
          where: { status?: string };
          data: Record<string, unknown>;
        }) => {
          if (
            attempt &&
            (where.status === undefined || attempt.status === where.status)
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

  it('uses hashed one-time state and transient OAuth before listing a private repository', async () => {
    const started = await request(app.getHttpServer())
      .post('/projects/PRJ-1/repository/github/attempts')
      .set('Authorization', 'Bearer test')
      .expect(201);
    const startedBody = JSON.parse(started.text) as { installationUrl: string };
    const installationUrl = new URL(startedBody.installationUrl);
    const state = installationUrl.searchParams.get('state');
    expect(state).toBeTruthy();
    expect(attempt?.stateDigest).toBeInstanceOf(Uint8Array);
    expect(JSON.stringify(attempt)).not.toContain(state);

    await request(app.getHttpServer())
      .get('/integrations/github/callback')
      .query({ state, installation_id: '9007199254740995' })
      .expect(302)
      .expect('Location', 'https://github.test/login/oauth/authorize');

    await request(app.getHttpServer())
      .get('/integrations/github/callback')
      .query({
        code: 'transient-code',
        state,
        installation_id: '9007199254740995',
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
});
