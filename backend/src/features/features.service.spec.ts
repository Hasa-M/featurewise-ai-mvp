import { ConflictException, NotFoundException } from '@nestjs/common';
import { FeatureOrigin, SpecRunStatus } from '@prisma/client';

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
    project: {
      findFirst: jest.fn().mockResolvedValue({ id: currentUser.projectId }),
    },
    feature: {
      create: jest.fn().mockResolvedValue(featureRecord),
      findFirst: jest.fn().mockResolvedValue(featureRecord),
      findMany: jest.fn().mockResolvedValue([featureRecord]),
      update: jest.fn().mockResolvedValue(featureRecord),
    },
    specRun: {
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
      service.createFeature(
        currentUser,
        currentUser.organizationId,
        currentUser.projectId,
        {
          title: '  New capability  ',
          brief: '  Useful thing  ',
          origin: FeatureOrigin.brand_new,
        },
      ),
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

  it('returns 404 for features outside the current project scope', async () => {
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
});
