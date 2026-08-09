import { NotFoundException } from '@nestjs/common';

import type { CurrentUserContext } from '../auth/current-user-context';
import type { PrismaService } from '../database/prisma.service';
import type { FeaturesService } from '../features/features.service';
import { ContextService } from './context.service';

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
};
const contextArtifact = {
  id: '00000000-0000-4000-8000-000000000005',
  publicNumber: 19,
  featureId: featureRecord.id,
  featureUpdateId: null,
  content: 'Current context',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createService(
  contextResult: typeof contextArtifact | null,
  update = jest.fn(),
) {
  const getFeatureRecord = jest.fn().mockResolvedValue(featureRecord);
  const findUnique = jest.fn().mockResolvedValue(contextResult);
  const service = new ContextService(
    { getFeatureRecord } as unknown as FeaturesService,
    {
      contextArtifact: {
        findUnique,
        update,
      },
    } as unknown as PrismaService,
  );

  return { findUnique, getFeatureRecord, service, update };
}

describe('ContextService', () => {
  it('reads a Feature ContextArtifact through its public key without exposing UUIDs', async () => {
    const { findUnique, getFeatureRecord, service } =
      createService(contextArtifact);

    const result = await service.getFeatureContext(currentUser, 5831);

    expect(result).toEqual({
      publicKey: 'CTX-19',
      featureKey: 'FEAT-5831',
      featureUpdateKey: null,
      content: contextArtifact.content,
      createdAt: contextArtifact.createdAt,
      updatedAt: contextArtifact.updatedAt,
    });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('featureId');
    expect(getFeatureRecord).toHaveBeenCalledWith(currentUser, 5831);
    expect(findUnique).toHaveBeenCalledWith({
      where: { featureId: featureRecord.id },
    });
  });

  it('updates ContextArtifact content by its internally resolved Feature UUID', async () => {
    const update = jest.fn().mockResolvedValue({
      ...contextArtifact,
      content: 'Updated context',
    });
    const { service } = createService(contextArtifact, update);

    await expect(
      service.updateFeatureContext(currentUser, 5831, {
        content: 'Updated context',
      }),
    ).resolves.toMatchObject({
      publicKey: 'CTX-19',
      featureKey: 'FEAT-5831',
      content: 'Updated context',
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: contextArtifact.id },
      data: { content: 'Updated context' },
    });
  });

  it('returns 404 when the ContextArtifact invariant is broken', async () => {
    const { service, update } = createService(null);

    await expect(
      service.getFeatureContext(currentUser, 5831),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.updateFeatureContext(currentUser, 5831, { content: 'New' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});
