import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { FeatureOrigin } from '@prisma/client';

import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

interface CurrentUserResponse {
  readonly userId: string;
  readonly username: string;
  readonly organizationId: string;
  readonly projectId: string;
}

interface OrganizationRecord {
  readonly id: string;
  name: string;
  readonly createdAt: Date;
  updatedAt: Date;
}

interface UserRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly username: string;
  readonly passwordHash: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  updatedAt: Date;
}

interface ProjectRecord {
  readonly id: string;
  readonly organizationId: string;
  name: string;
  readonly createdAt: Date;
  updatedAt: Date;
}

interface FeatureRecord {
  readonly id: string;
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

class InMemoryPrisma {
  private idCounter = 1;
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
        name: data.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.organizations.push(organization);

      return Promise.resolve(organization);
    },
    findUnique: ({ where }: { where: { id: string } }) =>
      Promise.resolve(
        this.organizations.find(
          (organization) => organization.id === where.id,
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
    findUnique: ({ where }: { where: { username: string } }) => {
      const user =
        this.users.find((candidate) => candidate.username === where.username) ??
        null;

      return Promise.resolve(
        user === null ? null : this.toUserWithWorkspace(user),
      );
    },
  };

  readonly project = {
    create: ({ data }: { data: { name: string; organizationId: string } }) => {
      const project: ProjectRecord = {
        id: this.nextId(),
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
        this.projects.filter(
          (project) => project.organizationId === where.organizationId,
        ),
      ),
    findFirst: ({ where }: { where: { id: string; organizationId: string } }) =>
      Promise.resolve(
        this.projects.find(
          (project) =>
            project.id === where.id &&
            project.organizationId === where.organizationId,
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
          featureId: feature.id,
          featureUpdateId: null,
          content: data.contextArtifact.create.content,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return Promise.resolve(feature);
    },
    findMany: ({ where }: { where: { projectId: string; deletedAt: null } }) =>
      Promise.resolve(
        this.features.filter(
          (feature) =>
            feature.projectId === where.projectId && feature.deletedAt === null,
        ),
      ),
    findFirst: ({
      where,
    }: {
      where: {
        id: string;
        projectId: string;
        deletedAt: null;
        project?: { organizationId: string };
      };
    }) => {
      const feature = this.features.find(
        (candidate) =>
          candidate.id === where.id &&
          candidate.projectId === where.projectId &&
          candidate.deletedAt === null,
      );

      if (feature === undefined || where.project === undefined) {
        return Promise.resolve(feature ?? null);
      }

      const project = this.projects.find(
        (candidate) => candidate.id === feature.projectId,
      );

      return Promise.resolve(
        project?.organizationId === where.project.organizationId
          ? feature
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

      return Promise.resolve(feature);
    },
  };

  readonly contextArtifact = {
    findUnique: ({ where }: { where: { id?: string; featureId?: string } }) =>
      Promise.resolve(
        this.contextArtifacts.find(
          (contextArtifact) =>
            (where.id !== undefined && contextArtifact.id === where.id) ||
            (where.featureId !== undefined &&
              contextArtifact.featureId === where.featureId),
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

  private toUserWithWorkspace(user: UserRecord) {
    return {
      ...user,
      organization: {
        projects: this.projects.filter(
          (project) => project.organizationId === user.organizationId,
        ),
      },
    };
  }
}

describe('Featurewise backend (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(() => {
    process.env.DATABASE_HOST ??= 'localhost';
    process.env.DATABASE_PORT ??= '5433';
    process.env.DATABASE_USER ??= 'featurewise_test_user';
    process.env.DATABASE_PASSWORD ??= 'featurewise_test_password';
    process.env.DATABASE_NAME ??= 'featurewise_test';
    process.env.DATABASE_SSL ??= 'false';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(new InMemoryPrisma())
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

  it('runs the temporary-auth workspace and feature CRUD flow', async () => {
    const currentUserResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .expect(200);
    const currentUser = currentUserResponse.body as CurrentUserResponse;

    await request(app.getHttpServer())
      .get('/organizations/00000000-0000-4000-8000-000000000099')
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/organizations/${currentUser.organizationId}`)
      .send({ name: 'Renamed organization' })
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          id: currentUser.organizationId,
          name: 'Renamed organization',
        });
      });

    await request(app.getHttpServer())
      .get(`/organizations/${currentUser.organizationId}/projects`)
      .expect(200)
      .expect((response: Response) => {
        const projects = response.body as ReadonlyArray<{
          readonly id: string;
        }>;

        expect(projects).toHaveLength(1);
        expect(projects[0]).toMatchObject({
          id: currentUser.projectId,
        });
      });

    await request(app.getHttpServer())
      .patch(
        `/organizations/${currentUser.organizationId}/projects/${currentUser.projectId}`,
      )
      .send({ name: 'Renamed project' })
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          id: currentUser.projectId,
          name: 'Renamed project',
        });
      });

    await request(app.getHttpServer())
      .post(
        `/organizations/${currentUser.organizationId}/projects/${currentUser.projectId}/features`,
      )
      .send({ title: 'Invalid origin feature', origin: 'unsupported' })
      .expect(400);

    const createFeatureResponse = await request(app.getHttpServer())
      .post(
        `/organizations/${currentUser.organizationId}/projects/${currentUser.projectId}/features`,
      )
      .send({
        title: 'New checkout',
        brief: 'Reduce friction in the checkout flow.',
        origin: FeatureOrigin.brand_new,
        includeInProjectContext: true,
      })
      .expect(201);
    const feature = createFeatureResponse.body as { id: string };

    await request(app.getHttpServer())
      .get(
        `/organizations/${currentUser.organizationId}/projects/${currentUser.projectId}/features`,
      )
      .expect(200)
      .expect((response: Response) => {
        const features = response.body as ReadonlyArray<{
          readonly id: string;
          readonly alignment: {
            readonly status: string;
            readonly pendingUpdates: readonly unknown[];
          };
        }>;

        expect(features).toHaveLength(1);
        expect(features[0]).toMatchObject({
          id: feature.id,
          alignment: {
            status: 'aligned',
            pendingUpdates: [],
          },
        });
      });

    await request(app.getHttpServer())
      .get(`/features/${feature.id}`)
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          id: feature.id,
          title: 'New checkout',
          includeInProjectContext: true,
        });
      });

    await request(app.getHttpServer())
      .get(`/features/${feature.id}/context`)
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          featureId: feature.id,
          content: '',
        });
      });

    await request(app.getHttpServer())
      .patch(`/features/${feature.id}/context`)
      .send({ content: 'Screenshots and notes go here.' })
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          featureId: feature.id,
          content: 'Screenshots and notes go here.',
        });
      });

    await request(app.getHttpServer())
      .patch(`/features/${feature.id}`)
      .send({ title: 'Updated checkout', includeInProjectContext: false })
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({
          id: feature.id,
          title: 'Updated checkout',
          includeInProjectContext: false,
        });
      });

    await request(app.getHttpServer())
      .delete(`/features/${feature.id}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/features/${feature.id}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(
        `/organizations/${currentUser.organizationId}/projects/${currentUser.projectId}/features`,
      )
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toHaveLength(0);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
