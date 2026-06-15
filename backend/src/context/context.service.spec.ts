import { NotFoundException } from '@nestjs/common';

import type { CurrentUserContext } from '../auth/current-user-context';
import type { PrismaService } from '../database/prisma.service';
import type { FeaturesService } from '../features/features.service';
import { ContextService } from './context.service';

const currentUser: CurrentUserContext = {
  organizationId: '00000000-0000-4000-8000-000000000001',
  projectId: '00000000-0000-4000-8000-000000000002',
  userId: '00000000-0000-4000-8000-000000000003',
  username: 'dev.operator',
};

const featureId = '00000000-0000-4000-8000-000000000004';
const contextArtifact = {
  id: '00000000-0000-4000-8000-000000000005',
  featureId,
  featureUpdateId: null,
  content: 'Current context',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ContextService', () => {
  it('reads the scoped feature ContextArtifact', async () => {
    const service = new ContextService(
      {
        getFeatureRecord: jest.fn().mockResolvedValue({ id: featureId }),
      } as unknown as FeaturesService,
      {
        contextArtifact: {
          findUnique: jest.fn().mockResolvedValue(contextArtifact),
        },
      } as unknown as PrismaService,
    );

    await expect(
      service.getFeatureContext(currentUser, featureId),
    ).resolves.toEqual(contextArtifact);
  });

  it('updates the scoped feature ContextArtifact content', async () => {
    const update = jest.fn().mockResolvedValue({
      ...contextArtifact,
      content: 'Updated context',
    });
    const service = new ContextService(
      {
        getFeatureRecord: jest.fn().mockResolvedValue({ id: featureId }),
      } as unknown as FeaturesService,
      {
        contextArtifact: {
          findUnique: jest.fn().mockResolvedValue(contextArtifact),
          update,
        },
      } as unknown as PrismaService,
    );

    await expect(
      service.updateFeatureContext(currentUser, featureId, {
        content: 'Updated context',
      }),
    ).resolves.toMatchObject({
      content: 'Updated context',
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: contextArtifact.id },
      data: { content: 'Updated context' },
    });
  });

  it('returns 404 when the ContextArtifact invariant is broken', async () => {
    const service = new ContextService(
      {
        getFeatureRecord: jest.fn().mockResolvedValue({ id: featureId }),
      } as unknown as FeaturesService,
      {
        contextArtifact: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      } as unknown as PrismaService,
    );

    await expect(
      service.getFeatureContext(currentUser, featureId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
