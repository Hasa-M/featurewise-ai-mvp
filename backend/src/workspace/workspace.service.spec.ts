import { NotFoundException } from '@nestjs/common';

import type { CurrentUserContext } from '../auth/current-user-context';
import type { PrismaService } from '../database/prisma.service';
import { WorkspaceService } from './workspace.service';

const currentUser: CurrentUserContext = {
  organizationId: '00000000-0000-4000-8000-000000000001',
  projectId: '00000000-0000-4000-8000-000000000002',
  userId: '00000000-0000-4000-8000-000000000003',
  username: 'dev.operator',
};

describe('WorkspaceService', () => {
  it('returns 404 when the organization is outside the current user scope', async () => {
    const service = new WorkspaceService({} as PrismaService);

    await expect(
      service.getOrganization(
        currentUser,
        '00000000-0000-4000-8000-000000000099',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates the scoped organization name', async () => {
    const organization = {
      id: currentUser.organizationId,
      name: 'Featurewise',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const findUnique = jest.fn().mockResolvedValue(organization);
    const update = jest.fn().mockResolvedValue({
      ...organization,
      name: 'Renamed',
    });
    const service = new WorkspaceService({
      organization: {
        findUnique,
        update,
      },
    } as unknown as PrismaService);

    await expect(
      service.updateOrganization(currentUser, currentUser.organizationId, {
        name: '  Renamed  ',
      }),
    ).resolves.toMatchObject({
      name: 'Renamed',
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: currentUser.organizationId },
      data: { name: 'Renamed' },
    });
  });

  it('returns 404 when the project is outside the current user scope', async () => {
    const service = new WorkspaceService({} as PrismaService);

    await expect(
      service.getProject(
        currentUser,
        currentUser.organizationId,
        '00000000-0000-4000-8000-000000000099',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
