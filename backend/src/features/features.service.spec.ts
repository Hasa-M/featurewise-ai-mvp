import { ConflictException, NotFoundException } from '@nestjs/common';
import { FeatureOrigin, SpecRunKind, SpecRunStatus } from '@prisma/client';

import type { CurrentUserContext } from '../auth/current-user-context';
import type { PrismaService } from '../database/prisma.service';
import { FeaturesService } from './features.service';

const currentUser: CurrentUserContext = {
  organizationId: '00000000-0000-4000-8000-000000000001',
  projectId: '00000000-0000-4000-8000-000000000002',
  userId: '00000000-0000-4000-8000-000000000003',
  username: 'dev.operator',
};

const featureRecord = {
  id: '00000000-0000-4000-8000-000000000004',
  projectId: currentUser.projectId,
  title: 'Feature',
  brief: null,
  origin: FeatureOrigin.brand_new,
  includeInProjectContext: false,
  createdById: currentUser.userId,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function createPrismaMock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    $transaction: jest.fn(),
    feature: {
      create: jest.fn().mockResolvedValue(featureRecord),
      findFirst: jest.fn().mockResolvedValue(featureRecord),
      findMany: jest.fn().mockResolvedValue([featureRecord]),
      update: jest.fn().mockResolvedValue(featureRecord),
    },
    specRun: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    generatedSpec: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    featureUpdate: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
}

describe('FeaturesService', () => {
  it('creates a feature and its empty ContextArtifact in one transaction', async () => {
    const prismaMock = createPrismaMock();
    type FeatureTransaction = {
      readonly feature: {
        readonly create: typeof prismaMock.feature.create;
      };
    };
    type FeatureCreateCall = {
      readonly data: {
        readonly brief: string;
        readonly createdById: string;
        readonly includeInProjectContext: boolean;
        readonly origin: FeatureOrigin;
        readonly projectId: string;
        readonly title: string;
        readonly contextArtifact: {
          readonly create: {
            readonly content: string;
          };
        };
      };
    };

    prismaMock.$transaction.mockImplementation(
      <T>(callback: (transaction: FeatureTransaction) => Promise<T>) =>
        callback({
          feature: {
            create: prismaMock.feature.create,
          },
        }),
    );
    const service = new FeaturesService(prismaMock as unknown as PrismaService);

    await expect(
      service.createFeature(currentUser, currentUser.projectId, {
        title: '  New capability  ',
        brief: '  Useful thing  ',
        origin: FeatureOrigin.brand_new,
      }),
    ).resolves.toMatchObject({
      title: 'Feature',
      alignment: {
        status: 'aligned',
      },
    });
    expect(prismaMock.feature.create).toHaveBeenCalledTimes(1);

    const [[createFeatureCall]] = prismaMock.feature.create.mock.calls as [
      [FeatureCreateCall],
    ];

    expect(createFeatureCall).toEqual({
      data: {
        brief: 'Useful thing',
        createdById: currentUser.userId,
        includeInProjectContext: false,
        origin: FeatureOrigin.brand_new,
        projectId: currentUser.projectId,
        title: 'New capability',
        contextArtifact: {
          create: {
            content: '',
          },
        },
      },
    });
  });

  it('lists features for a visible project', async () => {
    const prismaMock = createPrismaMock();
    const service = new FeaturesService(prismaMock as unknown as PrismaService);

    await expect(
      service.listFeatures(currentUser, currentUser.projectId),
    ).resolves.toEqual([
      expect.objectContaining({
        id: featureRecord.id,
        projectId: currentUser.projectId,
      }),
    ]);
    expect(prismaMock.feature.findMany).toHaveBeenCalledWith({
      where: {
        projectId: currentUser.projectId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('returns direct generation activity without folding in update or consolidation runs', async () => {
    const prismaMock = createPrismaMock({
      generatedSpec: {
        findFirst: jest
          .fn()
          .mockImplementation(
            ({ select }: { select: Record<string, boolean> }) =>
              Promise.resolve(
                'version' in select
                  ? { version: 3 }
                  : { incorporatedUpdates: [] },
              ),
          ),
      },
      specRun: {
        count: jest.fn().mockResolvedValue(4),
        findFirst: jest.fn().mockResolvedValue({
          genSettings: {
            includeProjectSummary: true,
          },
          runKind: SpecRunKind.consolidation,
          status: SpecRunStatus.completed,
        }),
      },
    });
    const service = new FeaturesService(prismaMock as unknown as PrismaService);

    await expect(
      service.getFeature(currentUser, featureRecord.id),
    ).resolves.toMatchObject({
      activity: {
        currentValidSpecVersion: 3,
        generationRunCount: 4,
        latestFeatureRun: {
          runKind: SpecRunKind.consolidation,
          status: SpecRunStatus.completed,
          usedProjectContext: true,
        },
      },
    });
    expect(prismaMock.specRun.count).toHaveBeenCalledWith({
      where: {
        featureId: featureRecord.id,
        featureUpdateId: null,
        runKind: SpecRunKind.generation,
      },
    });
  });

  it('returns 404 when listing features for a project outside the current user visibility', async () => {
    const prismaMock = createPrismaMock();
    const service = new FeaturesService(prismaMock as unknown as PrismaService);

    await expect(
      service.listFeatures(currentUser, '00000000-0000-4000-8000-000000000099'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.feature.findMany).not.toHaveBeenCalled();
  });

  it('returns 404 when creating a feature for a project outside the current user visibility', async () => {
    const prismaMock = createPrismaMock();
    const service = new FeaturesService(prismaMock as unknown as PrismaService);

    await expect(
      service.createFeature(
        currentUser,
        '00000000-0000-4000-8000-000000000099',
        {
          title: 'New capability',
          origin: FeatureOrigin.brand_new,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('blocks soft delete while the feature has a non-terminal spec run', async () => {
    const prismaMock = createPrismaMock({
      specRun: {
        findFirst: jest.fn().mockResolvedValue({
          id: '00000000-0000-4000-8000-000000000005',
          status: SpecRunStatus.queued,
        }),
      },
    });
    const service = new FeaturesService(prismaMock as unknown as PrismaService);

    await expect(
      service.deleteFeature(currentUser, featureRecord.id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.feature.update).not.toHaveBeenCalled();
  });

  it('returns 404 for features outside the visible project', async () => {
    const prismaMock = createPrismaMock({
      feature: {
        ...createPrismaMock().feature,
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new FeaturesService(prismaMock as unknown as PrismaService);

    await expect(
      service.getFeature(currentUser, featureRecord.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scopes feature reads by visible project id', async () => {
    const prismaMock = createPrismaMock();
    const service = new FeaturesService(prismaMock as unknown as PrismaService);

    await expect(
      service.getFeature(currentUser, featureRecord.id),
    ).resolves.toMatchObject({
      id: featureRecord.id,
    });
    expect(prismaMock.feature.findFirst).toHaveBeenCalledWith({
      where: {
        id: featureRecord.id,
        deletedAt: null,
        projectId: currentUser.projectId,
      },
    });
  });

  it('does not update a feature outside the visible project', async () => {
    const prismaMock = createPrismaMock({
      feature: {
        ...createPrismaMock().feature,
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new FeaturesService(prismaMock as unknown as PrismaService);

    await expect(
      service.updateFeature(currentUser, featureRecord.id, {
        title: 'Updated',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.feature.update).not.toHaveBeenCalled();
  });

  it('does not delete a feature outside the visible project', async () => {
    const prismaMock = createPrismaMock({
      feature: {
        ...createPrismaMock().feature,
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new FeaturesService(prismaMock as unknown as PrismaService);

    await expect(
      service.deleteFeature(currentUser, featureRecord.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.specRun.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.feature.update).not.toHaveBeenCalled();
  });
});
