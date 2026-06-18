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

  it('returns 404 when the project is outside the current user visibility', async () => {
    const findUnique = jest.fn();
    const service = new WorkspaceService({
      project: {
        findUnique,
      },
    } as unknown as PrismaService);

    await expect(
      service.getProject(currentUser, '00000000-0000-4000-8000-000000000099'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when the visible project cannot be found', async () => {
    const service = new WorkspaceService({
      project: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService);

    await expect(
      service.getProject(currentUser, currentUser.projectId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists projects for the authenticated organization', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new WorkspaceService({
      project: {
        findMany,
      },
    } as unknown as PrismaService);

    await expect(
      service.listProjects(currentUser, currentUser.organizationId),
    ).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        organizationId: currentUser.organizationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  });

  it('returns 404 when listing projects for an organization outside the current user visibility', async () => {
    const findMany = jest.fn();
    const service = new WorkspaceService({
      project: {
        findMany,
      },
    } as unknown as PrismaService);

    await expect(
      service.listProjects(currentUser, '00000000-0000-4000-8000-000000000099'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('updates the scoped project name', async () => {
    const project = {
      id: currentUser.projectId,
      organizationId: currentUser.organizationId,
      name: 'MVP',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const findUnique = jest.fn().mockResolvedValue(project);
    const update = jest.fn().mockResolvedValue({
      ...project,
      name: 'Renamed project',
    });
    const service = new WorkspaceService({
      project: {
        findUnique,
        update,
      },
    } as unknown as PrismaService);

    await expect(
      service.updateProject(currentUser, currentUser.projectId, {
        name: '  Renamed project  ',
      }),
    ).resolves.toMatchObject({
      name: 'Renamed project',
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        id: currentUser.projectId,
      },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: currentUser.projectId },
      data: { name: 'Renamed project' },
    });
  });
});
