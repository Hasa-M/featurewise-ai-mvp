import { ConflictException, NotFoundException } from '@nestjs/common';
import { AnalysisRunStatus } from '@prisma/client';

import type { CurrentUserContext } from '../auth/current-user-context';
import type { PrismaService } from '../database/prisma.service';
import type { WorkspaceService } from '../workspace/workspace.service';
import { FeaturesService } from './features.service';

const currentUser: CurrentUserContext = {
  organizationId: '00000000-0000-4000-8000-000000000001',
  organizationKey: 'ORG-12',
  projectId: '00000000-0000-4000-8000-000000000002',
  projectKey: 'PRJ-204',
  userId: '00000000-0000-4000-8000-000000000003',
  userKey: 'USR-7',
  username: 'dev.operator',
};

const featureRecord = {
  id: '00000000-0000-4000-8000-000000000004',
  publicNumber: 5831,
  projectId: currentUser.projectId,
  title: 'Feature',
  specificationContent: '',
  createdById: currentUser.userId,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  createdBy: { publicNumber: 7 },
  project: { publicNumber: 204 },
};

const publicRelations = {
  createdBy: { select: { publicNumber: true } },
  project: { select: { publicNumber: true } },
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
    analysisRun: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    ...overrides,
  };
}

function createWorkspaceMock() {
  return {
    getProjectRecord: jest.fn().mockResolvedValue({
      id: currentUser.projectId,
      publicNumber: 204,
      organizationId: currentUser.organizationId,
      name: 'MVP',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };
}

function createService(
  prismaMock: ReturnType<typeof createPrismaMock>,
  workspaceMock = createWorkspaceMock(),
) {
  return new FeaturesService(
    prismaMock as unknown as PrismaService,
    workspaceMock as unknown as WorkspaceService,
  );
}

describe('FeaturesService', () => {
  it('creates a Feature through a Project public number and uses the resolved UUID internally', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.feature.create.mockResolvedValue({
      ...featureRecord,
      specificationContent: 'Useful thing',
    });
    prismaMock.$transaction.mockImplementation(
      <T>(
        callback: (transaction: {
          feature: typeof prismaMock.feature;
        }) => Promise<T>,
      ) => callback({ feature: prismaMock.feature }),
    );
    const workspaceMock = createWorkspaceMock();
    const service = createService(prismaMock, workspaceMock);

    const result = await service.createFeature(currentUser, 204, {
      title: '  New capability  ',
      specificationContent: '  Useful thing  ',
    });

    expect(result).toEqual({
      publicKey: 'FEAT-5831',
      projectKey: 'PRJ-204',
      title: 'Feature',
      specificationContent: 'Useful thing',
      createdByKey: 'USR-7',
      createdAt: featureRecord.createdAt,
      updatedAt: featureRecord.updatedAt,
    });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('projectId');
    expect(workspaceMock.getProjectRecord).toHaveBeenCalledWith(
      currentUser,
      204,
    );
    expect(prismaMock.feature.create).toHaveBeenCalledWith({
      data: {
        createdById: currentUser.userId,
        projectId: currentUser.projectId,
        specificationContent: 'Useful thing',
        title: 'New capability',
        contextArtifact: { create: { content: '' } },
      },
      include: publicRelations,
    });
  });

  it('lists Features for a Project public number using only the specification-analysis contract', async () => {
    const prismaMock = createPrismaMock();
    const workspaceMock = createWorkspaceMock();
    const service = createService(prismaMock, workspaceMock);

    await expect(service.listFeatures(currentUser, 204)).resolves.toEqual([
      {
        publicKey: 'FEAT-5831',
        projectKey: 'PRJ-204',
        title: 'Feature',
        specificationContent: '',
        createdByKey: 'USR-7',
        createdAt: featureRecord.createdAt,
        updatedAt: featureRecord.updatedAt,
      },
    ]);
    expect(prismaMock.feature.findMany).toHaveBeenCalledWith({
      where: {
        projectId: currentUser.projectId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: publicRelations,
    });
  });

  it('updates the canonical specification field', async () => {
    const updatedRecord = {
      ...featureRecord,
      specificationContent: 'Updated specification',
    };
    const prismaMock = createPrismaMock({
      feature: {
        ...createPrismaMock().feature,
        update: jest.fn().mockResolvedValue(updatedRecord),
      },
    });
    const service = createService(prismaMock);

    const result = await service.updateFeature(currentUser, 5831, {
      specificationContent: '  Updated specification  ',
    });

    expect(prismaMock.feature.update).toHaveBeenCalledWith({
      where: { id: featureRecord.id },
      data: { specificationContent: 'Updated specification' },
      include: publicRelations,
    });
    expect(result.specificationContent).toBe('Updated specification');
  });

  it('stores an empty specification as an empty string', async () => {
    const prismaMock = createPrismaMock();
    const service = createService(prismaMock);

    const result = await service.updateFeature(currentUser, 5831, {
      specificationContent: '   ',
    });

    expect(prismaMock.feature.update).toHaveBeenCalledWith({
      where: { id: featureRecord.id },
      data: { specificationContent: '' },
      include: publicRelations,
    });
    expect(result.specificationContent).toBe('');
  });

  it('returns 404 before listing or creating under an inaccessible Project key', async () => {
    const prismaMock = createPrismaMock();
    const workspaceMock = createWorkspaceMock();
    workspaceMock.getProjectRecord.mockRejectedValue(
      new NotFoundException('Project not found'),
    );
    const service = createService(prismaMock, workspaceMock);

    await expect(service.listFeatures(currentUser, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.createFeature(currentUser, 999, {
        title: 'New capability',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.feature.findMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('blocks soft delete while the Feature has a non-terminal AnalysisRun', async () => {
    const prismaMock = createPrismaMock({
      analysisRun: {
        findFirst: jest.fn().mockResolvedValue({
          id: '00000000-0000-4000-8000-000000000005',
          status: AnalysisRunStatus.queued,
        }),
      },
    });
    const service = createService(prismaMock);

    await expect(
      service.deleteFeature(currentUser, 5831),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.feature.update).not.toHaveBeenCalled();
  });

  it('scopes a Feature public number by internal Project and Organization UUIDs', async () => {
    const prismaMock = createPrismaMock();
    const service = createService(prismaMock);

    const result = await service.getFeature(currentUser, 5831);

    expect(result).toMatchObject({ publicKey: 'FEAT-5831' });
    expect(result).not.toHaveProperty('id');
    expect(prismaMock.feature.findFirst).toHaveBeenCalledWith({
      where: {
        publicNumber: 5831,
        deletedAt: null,
        projectId: currentUser.projectId,
        project: { organizationId: currentUser.organizationId },
      },
      include: publicRelations,
    });
  });

  it('resolves a Feature public number only under the resolved Project', async () => {
    const prismaMock = createPrismaMock();
    const service = createService(prismaMock);

    await expect(
      service.getProjectFeature(currentUser, 204, 5831),
    ).resolves.toMatchObject({
      publicKey: 'FEAT-5831',
      projectKey: 'PRJ-204',
    });
    expect(prismaMock.feature.findFirst).toHaveBeenCalledWith({
      where: {
        publicNumber: 5831,
        deletedAt: null,
        projectId: currentUser.projectId,
        project: { organizationId: currentUser.organizationId },
      },
      include: publicRelations,
    });
  });

  it('returns 404 when a Feature key does not belong to the resolved Project', async () => {
    const prismaMock = createPrismaMock({
      feature: {
        ...createPrismaMock().feature,
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = createService(prismaMock);

    await expect(
      service.getProjectFeature(currentUser, 204, 9999),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not update or delete a Feature outside the visible Project', async () => {
    const prismaMock = createPrismaMock({
      feature: {
        ...createPrismaMock().feature,
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = createService(prismaMock);

    await expect(
      service.updateFeature(currentUser, 9999, { title: 'Updated' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.deleteFeature(currentUser, 9999),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.analysisRun.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.feature.update).not.toHaveBeenCalled();
  });
});
