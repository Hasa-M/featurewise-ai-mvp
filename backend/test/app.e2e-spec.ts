import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { FeatureOrigin } from '@prisma/client';
import { argon2id, hash } from 'argon2';
import request, { Response, Test as SuperTestRequest } from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

const TEST_USERNAME = 'dev.operator';
const TEST_PASSWORD = 'correct-test-password';
const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}/i;

interface CurrentUserResponse {
  readonly userKey: string;
  readonly username: string;
  readonly organizationKey: string;
  readonly projectKey: string;
}

interface LoginResponse {
  readonly accessToken: string;
  readonly expiresInSeconds: number;
  readonly tokenType: 'Bearer';
  readonly user: CurrentUserResponse;
}

interface OrganizationRecord {
  readonly id: string;
  readonly publicNumber: number;
  name: string;
  readonly createdAt: Date;
  updatedAt: Date;
}

interface UserRecord {
  readonly id: string;
  readonly publicNumber: number;
  readonly organizationId: string;
  readonly username: string;
  readonly passwordHash: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  updatedAt: Date;
}

interface ProjectRecord {
  readonly id: string;
  readonly publicNumber: number;
  readonly organizationId: string;
  name: string;
  readonly createdAt: Date;
  updatedAt: Date;
}

interface FeatureRecord {
  readonly id: string;
  readonly publicNumber: number;
  readonly projectId: string;
  title: string;
  brief: string | null;
  readonly origin: FeatureOrigin;
  includeInProjectContext: boolean;
  readonly createdById: string;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface ContextArtifactRecord {
  readonly id: string;
  readonly publicNumber: number;
  readonly featureId: string | null;
  readonly featureUpdateId: string | null;
  content: string;
  readonly createdAt: Date;
  updatedAt: Date;
}

interface FeatureCreateData {
  readonly projectId: string;
  readonly title: string;
  readonly brief: string | null;
  readonly origin: FeatureOrigin;
  readonly includeInProjectContext: boolean;
  readonly createdById: string;
  readonly contextArtifact?: {
    readonly create: {
      readonly content: string;
    };
  };
}

interface SeededWorkspace {
  readonly organizationId: string;
  readonly projectId: string;
  readonly userId: string;
}

class InMemoryPrisma {
  private idCounter = 1;
  private organizationPublicNumberCounter = 1;
  private userPublicNumberCounter = 1;
  private projectPublicNumberCounter = 1;
  private featurePublicNumberCounter = 1;
  private contextArtifactPublicNumberCounter = 1;
  private readonly organizations: OrganizationRecord[] = [];
  private readonly users: UserRecord[] = [];
  private readonly projects: ProjectRecord[] = [];
  private readonly features: FeatureRecord[] = [];
  private readonly contextArtifacts: ContextArtifactRecord[] = [];

  readonly $connect = jest.fn();
  readonly $disconnect = jest.fn();
  readonly $queryRaw = jest.fn().mockResolvedValue([{ result: 1 }]);
  readonly $transaction = jest.fn(
    <T>(callback: (transaction: InMemoryPrisma) => Promise<T>) =>
      callback(this),
  );

  readonly organization = {
    create: ({ data }: { data: { name: string } }) => {
      const organization: OrganizationRecord = {
        id: this.nextId(),
        publicNumber: this.organizationPublicNumberCounter++,
        name: data.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.organizations.push(organization);

      return Promise.resolve(organization);
    },
    findFirst: ({ where }: { where: { id: string; publicNumber: number } }) =>
      Promise.resolve(
        this.organizations.find(
          (organization) =>
            organization.id === where.id &&
            organization.publicNumber === where.publicNumber,
        ) ?? null,
      ),
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: { name: string };
    }) => {
      const organization = this.organizations.find(
        (candidate) => candidate.id === where.id,
      );

      if (organization === undefined) {
        throw new Error('Organization not found');
      }

      organization.name = data.name;
      organization.updatedAt = new Date();

      return Promise.resolve(organization);
    },
  };

  readonly user = {
    create: ({
      data,
    }: {
      data: {
        organizationId: string;
        passwordHash: string;
        username: string;
      };
    }) => {
      const user: UserRecord = {
        id: this.nextId(),
        publicNumber: this.userPublicNumberCounter++,
        organizationId: data.organizationId,
        username: data.username,
        passwordHash: data.passwordHash,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.users.push(user);

      return Promise.resolve(user);
    },
    findUnique: ({
      where,
    }: {
      where: { publicNumber?: number; username?: string };
    }) => {
      const user =
        this.users.find(
          (candidate) =>
            (where.publicNumber !== undefined &&
              candidate.publicNumber === where.publicNumber) ||
            (where.username !== undefined &&
              candidate.username === where.username),
        ) ?? null;

      return Promise.resolve(
        user === null ? null : this.toUserWithWorkspace(user),
      );
    },
  };

  readonly project = {
    create: ({ data }: { data: { name: string; organizationId: string } }) => {
      const project: ProjectRecord = {
        id: this.nextId(),
        publicNumber: this.projectPublicNumberCounter++,
        organizationId: data.organizationId,
        name: data.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.projects.push(project);

      return Promise.resolve(project);
    },
    findMany: ({ where }: { where: { organizationId: string } }) =>
      Promise.resolve(
        this.projects
          .filter((project) => project.organizationId === where.organizationId)
          .map((project) => ({
            ...project,
            _count: {
              features: this.features.filter(
                (feature) =>
                  feature.projectId === project.id &&
                  feature.deletedAt === null,
              ).length,
            },
          })),
      ),
    findFirst: ({
      where,
    }: {
      where: {
        organizationId: string;
        id: string;
        publicNumber: number;
      };
    }) =>
      Promise.resolve(
        this.projects.find(
          (project) =>
            project.organizationId === where.organizationId &&
            project.id === where.id &&
            project.publicNumber === where.publicNumber,
        ) ?? null,
      ),
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: { name: string };
    }) => {
      const project = this.projects.find(
        (candidate) => candidate.id === where.id,
      );

      if (project === undefined) {
        throw new Error('Project not found');
      }

      project.name = data.name;
      project.updatedAt = new Date();

      return Promise.resolve(project);
    },
  };

  readonly feature = {
    create: ({ data }: { data: FeatureCreateData }) => {
      const feature: FeatureRecord = {
        id: this.nextId(),
        publicNumber: this.featurePublicNumberCounter++,
        projectId: data.projectId,
        title: data.title,
        brief: data.brief,
        origin: data.origin,
        includeInProjectContext: data.includeInProjectContext,
        createdById: data.createdById,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      this.features.push(feature);

      if (data.contextArtifact !== undefined) {
        this.contextArtifacts.push({
          id: this.nextId(),
          publicNumber: this.contextArtifactPublicNumberCounter++,
          featureId: feature.id,
          featureUpdateId: null,
          content: data.contextArtifact.create.content,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return Promise.resolve(this.toFeatureWithPublicRelations(feature));
    },
    findMany: ({ where }: { where: { projectId: string; deletedAt: null } }) =>
      Promise.resolve(
        this.features
          .filter(
            (feature) =>
              feature.projectId === where.projectId &&
              feature.deletedAt === null,
          )
          .map((feature) => this.toFeatureWithPublicRelations(feature)),
      ),
    findFirst: ({
      where,
    }: {
      where: {
        publicNumber: number;
        projectId: string;
        deletedAt: null;
        project: { organizationId: string };
      };
    }) => {
      const feature = this.features.find(
        (candidate) =>
          candidate.publicNumber === where.publicNumber &&
          candidate.projectId === where.projectId &&
          candidate.deletedAt === null,
      );

      if (feature === undefined) {
        return Promise.resolve(null);
      }

      const project = this.projects.find(
        (candidate) => candidate.id === feature.projectId,
      );

      return Promise.resolve(
        project?.organizationId === where.project.organizationId
          ? this.toFeatureWithPublicRelations(feature)
          : null,
      );
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<{
        title: string;
        brief: string | null;
        includeInProjectContext: boolean;
        deletedAt: Date;
      }>;
    }) => {
      const feature = this.features.find(
        (candidate) => candidate.id === where.id,
      );

      if (feature === undefined) {
        throw new Error('Feature not found');
      }

      Object.assign(feature, data);
      feature.updatedAt = new Date();

      return Promise.resolve(this.toFeatureWithPublicRelations(feature));
    },
  };

  readonly contextArtifact = {
    findUnique: ({ where }: { where: { featureId: string } }) =>
      Promise.resolve(
        this.contextArtifacts.find(
          (contextArtifact) => contextArtifact.featureId === where.featureId,
        ) ?? null,
      ),
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: { content: string };
    }) => {
      const contextArtifact = this.contextArtifacts.find(
        (candidate) => candidate.id === where.id,
      );

      if (contextArtifact === undefined) {
        throw new Error('ContextArtifact not found');
      }

      contextArtifact.content = data.content;
      contextArtifact.updatedAt = new Date();

      return Promise.resolve(contextArtifact);
    },
  };

  readonly specRun = {
    count: jest.fn().mockResolvedValue(0),
    findFirst: jest.fn().mockResolvedValue(null),
  };

  readonly generatedSpec = {
    findFirst: jest.fn().mockResolvedValue(null),
  };

  readonly featureUpdate = {
    findMany: jest.fn().mockResolvedValue([]),
  };

  private nextId(): string {
    const suffix = this.idCounter.toString().padStart(12, '0');

    this.idCounter += 1;

    return `00000000-0000-4000-8000-${suffix}`;
  }

  private toFeatureWithPublicRelations(feature: FeatureRecord) {
    const project = this.projects.find(
      (candidate) => candidate.id === feature.projectId,
    );
    const creator = this.users.find(
      (candidate) => candidate.id === feature.createdById,
    );

    if (project === undefined || creator === undefined) {
      throw new Error('Feature relations not found');
    }

    return {
      ...feature,
      createdBy: { publicNumber: creator.publicNumber },
      project: { publicNumber: project.publicNumber },
    };
  }

  private toUserWithWorkspace(user: UserRecord) {
    const organization = this.organizations.find(
      (candidate) => candidate.id === user.organizationId,
    );

    if (organization === undefined) {
      throw new Error('User organization not found');
    }

    return {
      ...user,
      organization: {
        publicNumber: organization.publicNumber,
        projects: this.projects.filter(
          (project) => project.organizationId === user.organizationId,
        ),
      },
    };
  }
}

async function seedWorkspace(prisma: InMemoryPrisma): Promise<SeededWorkspace> {
  const organization = await prisma.organization.create({
    data: { name: 'Featurewise Test Organization' },
  });
  const user = await prisma.user.create({
    data: {
      organizationId: organization.id,
      passwordHash: await hash(TEST_PASSWORD, { type: argon2id }),
      username: TEST_USERNAME,
    },
  });
  const project = await prisma.project.create({
    data: {
      name: 'Featurewise Test Project',
      organizationId: organization.id,
    },
  });

  return {
    organizationId: organization.id,
    projectId: project.id,
    userId: user.id,
  };
}

function withAuth(
  requestTest: SuperTestRequest,
  authorizationHeader: string,
): SuperTestRequest {
  return requestTest.set('Authorization', authorizationHeader);
}

function expectNoUuid(value: unknown): void {
  expect(JSON.stringify(value)).not.toMatch(UUID_PATTERN);
}

describe('Featurewise backend (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: InMemoryPrisma;
  let seededWorkspace: SeededWorkspace;

  beforeAll(() => {
    process.env.DATABASE_HOST ??= 'localhost';
    process.env.DATABASE_PORT ??= '5433';
    process.env.DATABASE_USER ??= 'featurewise_test_user';
    process.env.DATABASE_PASSWORD ??= 'featurewise_test_password';
    process.env.DATABASE_NAME ??= 'featurewise_test';
    process.env.DATABASE_SSL ??= 'false';
    process.env.AUTH_TOKEN_SECRET = 'featurewise_test_auth_secret';
    process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS = '3600';
  });

  beforeEach(async () => {
    prisma = new InMemoryPrisma();
    seededWorkspace = await seedWorkspace(prisma);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((response: Response) => {
        const body = response.body as Record<string, unknown>;

        expect(body).toMatchObject({
          environment: 'test',
          service: 'featurewise-backend',
          status: 'ok',
        });
        expect(typeof body.timestamp).toBe('string');
        expect(typeof body.uptimeSeconds).toBe('number');
      });
  });

  it('uses public keys throughout the authenticated workspace and feature flow', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: TEST_USERNAME, password: 'wrong-password' })
      .expect(401);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)
      .expect((response: Response) => {
        const body = response.body as LoginResponse;

        expect(body).toMatchObject({
          expiresInSeconds: 3600,
          tokenType: 'Bearer',
          user: {
            userKey: 'USR-1',
            username: TEST_USERNAME,
            organizationKey: 'ORG-1',
            projectKey: 'PRJ-1',
          },
        });
        expect(typeof body.accessToken).toBe('string');
        expectNoUuid(body);
      });
    const login = loginResponse.body as LoginResponse;
    const authorizationHeader = `${login.tokenType} ${login.accessToken}`;

    const jwtPayload = JSON.parse(
      Buffer.from(
        login.accessToken.split('.')[1] ?? '',
        'base64url',
      ).toString(),
    ) as { sub?: unknown };
    expect(jwtPayload.sub).toBe('USR-1');

    await withAuth(
      request(app.getHttpServer()).get('/auth/me'),
      authorizationHeader,
    )
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toEqual(login.user);
        expectNoUuid(response.body);
      });

    const legacyToken = await app
      .get(JwtService)
      .signAsync(
        { sub: seededWorkspace.userId },
        { expiresIn: 3600, secret: 'featurewise_test_auth_secret' },
      );
    await withAuth(
      request(app.getHttpServer()).get('/auth/me'),
      `Bearer ${legacyToken}`,
    ).expect(401);

    await withAuth(
      request(app.getHttpServer()).get('/organizations/ORG-999'),
      authorizationHeader,
    ).expect(404);
    await withAuth(
      request(app.getHttpServer()).get('/organizations/ORG-01'),
      authorizationHeader,
    ).expect(400);
    await withAuth(
      request(app.getHttpServer()).get('/organizations/PRJ-1'),
      authorizationHeader,
    ).expect(400);

    await withAuth(
      request(app.getHttpServer()).patch('/organizations/ORG-1'),
      authorizationHeader,
    )
      .send({ name: 'Renamed organization' })
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          publicKey: 'ORG-1',
          name: 'Renamed organization',
        });
        expectNoUuid(response.body);
      });

    await withAuth(
      request(app.getHttpServer()).get('/organizations/ORG-1/projects'),
      authorizationHeader,
    )
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toEqual([
          expect.objectContaining({
            publicKey: 'PRJ-1',
            organizationKey: 'ORG-1',
            featureCount: 0,
          }),
        ]);
        expectNoUuid(response.body);
      });

    await withAuth(
      request(app.getHttpServer()).get('/projects/PRJ-1'),
      authorizationHeader,
    )
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          publicKey: 'PRJ-1',
          organizationKey: 'ORG-1',
        });
        expectNoUuid(response.body);
      });

    await withAuth(
      request(app.getHttpServer()).get('/projects/PRJ-01'),
      authorizationHeader,
    ).expect(400);
    await withAuth(
      request(app.getHttpServer()).get('/projects/PRJ-999999'),
      authorizationHeader,
    ).expect(404);

    await withAuth(
      request(app.getHttpServer()).patch('/projects/PRJ-1'),
      authorizationHeader,
    )
      .send({ name: 'Renamed project' })
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          publicKey: 'PRJ-1',
          organizationKey: 'ORG-1',
          name: 'Renamed project',
        });
        expectNoUuid(response.body);
      });

    await withAuth(
      request(app.getHttpServer()).post('/projects/PRJ-1/features'),
      authorizationHeader,
    )
      .send({ title: 'Invalid origin feature', origin: 'unsupported' })
      .expect(400);

    const createFeatureResponse = await withAuth(
      request(app.getHttpServer()).post('/projects/PRJ-1/features'),
      authorizationHeader,
    )
      .send({
        title: 'New checkout',
        brief: 'Reduce friction in the checkout flow.',
        origin: FeatureOrigin.brand_new,
        includeInProjectContext: true,
      })
      .expect(201)
      .expect((response: Response) => expectNoUuid(response.body));
    const feature = createFeatureResponse.body as { publicKey: string };
    expect(feature.publicKey).toBe('FEAT-1');

    await withAuth(
      request(app.getHttpServer()).get('/projects/PRJ-1/features'),
      authorizationHeader,
    )
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toEqual([
          expect.objectContaining({
            publicKey: 'FEAT-1',
            projectKey: 'PRJ-1',
            createdByKey: 'USR-1',
            activity: {
              currentValidSpecVersion: null,
              generationRunCount: 0,
              latestFeatureRun: null,
            },
            alignment: {
              status: 'aligned',
              pendingUpdates: [],
            },
          }),
        ]);
        expectNoUuid(response.body);
      });

    await withAuth(
      request(app.getHttpServer()).get('/projects/PRJ-1/features/FEAT-1'),
      authorizationHeader,
    )
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          publicKey: 'FEAT-1',
          projectKey: 'PRJ-1',
          createdByKey: 'USR-1',
        });
        expectNoUuid(response.body);
      });

    await withAuth(
      request(app.getHttpServer()).get('/projects/PRJ-1/features/FEAT-0'),
      authorizationHeader,
    ).expect(400);
    await withAuth(
      request(app.getHttpServer()).get('/projects/PRJ-1/features/FEAT-999999'),
      authorizationHeader,
    ).expect(404);

    const otherOrganization = await prisma.organization.create({
      data: { name: 'Other organization' },
    });
    const otherProject = await prisma.project.create({
      data: {
        name: 'Other project',
        organizationId: otherOrganization.id,
      },
    });
    const otherFeature = await prisma.feature.create({
      data: {
        brief: null,
        createdById: seededWorkspace.userId,
        includeInProjectContext: false,
        origin: FeatureOrigin.brand_new,
        projectId: otherProject.id,
        title: 'Other feature',
      },
    });

    await withAuth(
      request(app.getHttpServer()).get(
        `/projects/PRJ-1/features/FEAT-${otherFeature.publicNumber}`,
      ),
      authorizationHeader,
    ).expect(404);
    await withAuth(
      request(app.getHttpServer()).get(
        `/features/FEAT-${otherFeature.publicNumber}`,
      ),
      authorizationHeader,
    ).expect(404);

    await withAuth(
      request(app.getHttpServer()).get('/features/FEAT-1'),
      authorizationHeader,
    )
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          publicKey: 'FEAT-1',
          projectKey: 'PRJ-1',
          title: 'New checkout',
          includeInProjectContext: true,
        });
        expectNoUuid(response.body);
      });

    await withAuth(
      request(app.getHttpServer()).get('/features/FEAT-1/context'),
      authorizationHeader,
    )
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          publicKey: 'CTX-1',
          featureKey: 'FEAT-1',
          featureUpdateKey: null,
          content: '',
        });
        expectNoUuid(response.body);
      });

    await withAuth(
      request(app.getHttpServer()).patch('/features/FEAT-1/context'),
      authorizationHeader,
    )
      .send({ content: 'Screenshots and notes go here.' })
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          publicKey: 'CTX-1',
          featureKey: 'FEAT-1',
          content: 'Screenshots and notes go here.',
        });
        expectNoUuid(response.body);
      });

    await withAuth(
      request(app.getHttpServer()).patch('/features/FEAT-1'),
      authorizationHeader,
    )
      .send({ title: 'Updated checkout', includeInProjectContext: false })
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          publicKey: 'FEAT-1',
          projectKey: 'PRJ-1',
          title: 'Updated checkout',
          includeInProjectContext: false,
        });
        expectNoUuid(response.body);
      });

    const legacyOrganizationId = seededWorkspace.organizationId;
    const legacyProjectId = seededWorkspace.projectId;
    const legacyFeatureId = '00000000-0000-4000-8000-000000000004';

    await withAuth(
      request(app.getHttpServer()).get(
        `/organizations/${legacyOrganizationId}`,
      ),
      authorizationHeader,
    ).expect(400);
    await withAuth(
      request(app.getHttpServer()).patch(
        `/organizations/${legacyOrganizationId}`,
      ),
      authorizationHeader,
    )
      .send({ name: 'Rejected' })
      .expect(400);
    await withAuth(
      request(app.getHttpServer()).get(
        `/organizations/${legacyOrganizationId}/projects`,
      ),
      authorizationHeader,
    ).expect(400);
    await withAuth(
      request(app.getHttpServer()).get(`/projects/${legacyProjectId}`),
      authorizationHeader,
    ).expect(400);
    await withAuth(
      request(app.getHttpServer()).patch(`/projects/${legacyProjectId}`),
      authorizationHeader,
    )
      .send({ name: 'Rejected' })
      .expect(400);
    await withAuth(
      request(app.getHttpServer()).get(`/projects/${legacyProjectId}/features`),
      authorizationHeader,
    ).expect(400);
    await withAuth(
      request(app.getHttpServer()).post(
        `/projects/${legacyProjectId}/features`,
      ),
      authorizationHeader,
    )
      .send({ title: 'Rejected', origin: FeatureOrigin.brand_new })
      .expect(400);
    await withAuth(
      request(app.getHttpServer()).get(
        `/projects/PRJ-1/features/${legacyFeatureId}`,
      ),
      authorizationHeader,
    ).expect(400);
    await withAuth(
      request(app.getHttpServer()).get(`/features/${legacyFeatureId}`),
      authorizationHeader,
    ).expect(400);
    await withAuth(
      request(app.getHttpServer()).patch(`/features/${legacyFeatureId}`),
      authorizationHeader,
    )
      .send({ title: 'Rejected' })
      .expect(400);
    await withAuth(
      request(app.getHttpServer()).delete(`/features/${legacyFeatureId}`),
      authorizationHeader,
    ).expect(400);
    await withAuth(
      request(app.getHttpServer()).get(`/features/${legacyFeatureId}/context`),
      authorizationHeader,
    ).expect(400);
    await withAuth(
      request(app.getHttpServer()).patch(
        `/features/${legacyFeatureId}/context`,
      ),
      authorizationHeader,
    )
      .send({ content: 'Rejected' })
      .expect(400);

    await withAuth(
      request(app.getHttpServer()).delete('/features/FEAT-1'),
      authorizationHeader,
    ).expect(204);
    await withAuth(
      request(app.getHttpServer()).get('/features/FEAT-1'),
      authorizationHeader,
    ).expect(404);
    await withAuth(
      request(app.getHttpServer()).get('/projects/PRJ-1/features'),
      authorizationHeader,
    )
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toHaveLength(0);
        expectNoUuid(response.body);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
