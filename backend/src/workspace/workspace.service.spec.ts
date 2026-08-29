import { NotFoundException } from '@nestjs/common';

import type { CurrentUserContext } from '../auth/current-user-context';
import type { PrismaService } from '../database/prisma.service';
import { WorkspaceService } from './workspace.service';

const currentUser: CurrentUserContext = {
  organizationId: '00000000-0000-4000-8000-000000000001',
  organizationKey: 'ORG-12',
  projectId: '00000000-0000-4000-8000-000000000002',
  projectKey: 'PRJ-204',
  userId: '00000000-0000-4000-8000-000000000003',
  userKey: 'USR-7',
  username: 'dev.operator',
};

const organization = {
  id: currentUser.organizationId,
  publicNumber: 12,
  name: 'Featurewise',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const project = {
  id: currentUser.projectId,
  publicNumber: 204,
  organizationId: currentUser.organizationId,
  name: 'MVP',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const projectContext = {
  id: '00000000-0000-4000-8000-000000000004',
  publicNumber: 31,
  projectId: currentUser.projectId,
  content: '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WorkspaceService', () => {
  it('returns 404 when an Organization public number is outside the current user scope', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new WorkspaceService({
      organization: { findFirst },
    } as unknown as PrismaService);

    await expect(
      service.getOrganization(currentUser, 999),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: currentUser.organizationId,
        publicNumber: 999,
      },
    });
  });

  it('updates an Organization by public number and returns no UUID identity', async () => {
    const findFirst = jest.fn().mockResolvedValue(organization);
    const update = jest.fn().mockResolvedValue({
      ...organization,
      name: 'Renamed',
    });
    const service = new WorkspaceService({
      organization: { findFirst, update },
    } as unknown as PrismaService);

    const result = await service.updateOrganization(currentUser, 12, {
      name: '  Renamed  ',
    });

    expect(result).toEqual({
      publicKey: 'ORG-12',
      name: 'Renamed',
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    });
    expect(result).not.toHaveProperty('id');
    expect(update).toHaveBeenCalledWith({
      where: { id: currentUser.organizationId },
      data: { name: 'Renamed' },
    });
  });

  it('resolves the visible Project by public number and returns public relations only', async () => {
    const findFirst = jest.fn().mockResolvedValue(project);
    const service = new WorkspaceService({
      project: { findFirst },
    } as unknown as PrismaService);

    const result = await service.getProject(currentUser, 204);

    expect(result).toEqual({
      publicKey: 'PRJ-204',
      organizationKey: 'ORG-12',
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('organizationId');
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: currentUser.organizationId,
        id: currentUser.projectId,
        publicNumber: 204,
      },
    });
  });

  it('returns 404 for an unknown Project public number', async () => {
    const service = new WorkspaceService({
      project: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService);

    await expect(service.getProject(currentUser, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists Projects under a public Organization key without exposing UUIDs', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ ...project, _count: { features: 2 } }]);
    const service = new WorkspaceService({
      organization: {
        findFirst: jest.fn().mockResolvedValue(organization),
      },
      project: { findMany },
    } as unknown as PrismaService);

    const result = await service.listProjects(currentUser, 12);

    expect(result).toEqual([
      {
        publicKey: 'PRJ-204',
        organizationKey: 'ORG-12',
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        featureCount: 2,
      },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { organizationId: currentUser.organizationId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            features: { where: { deletedAt: null } },
          },
        },
      },
    });
  });

  it('does not list Projects for an inaccessible Organization key', async () => {
    const findMany = jest.fn();
    const service = new WorkspaceService({
      organization: { findFirst: jest.fn().mockResolvedValue(null) },
      project: { findMany },
    } as unknown as PrismaService);

    await expect(service.listProjects(currentUser, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findMany).not.toHaveBeenCalled();
  });

  it('updates a Project by public number and uses its UUID only for Prisma', async () => {
    const findFirst = jest.fn().mockResolvedValue(project);
    const update = jest.fn().mockResolvedValue({
      ...project,
      name: 'Renamed project',
    });
    const service = new WorkspaceService({
      project: { findFirst, update },
    } as unknown as PrismaService);

    const result = await service.updateProject(currentUser, 204, {
      name: '  Renamed project  ',
    });

    expect(result).toMatchObject({
      publicKey: 'PRJ-204',
      organizationKey: 'ORG-12',
      name: 'Renamed project',
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: currentUser.projectId },
      data: { name: 'Renamed project' },
    });
  });

  it('materializes one empty ProjectContext after authorizing the Project', async () => {
    const findFirst = jest.fn().mockResolvedValue(project);
    const upsert = jest.fn().mockResolvedValue(projectContext);
    const service = new WorkspaceService({
      project: { findFirst },
      projectContext: { upsert },
    } as unknown as PrismaService);

    const result = await service.getProjectContext(currentUser, 204);

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: currentUser.organizationId,
        id: currentUser.projectId,
        publicNumber: 204,
      },
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { projectId: currentUser.projectId },
      create: {
        projectId: currentUser.projectId,
        content: '',
      },
      update: {},
    });
    expect(result).toEqual({
      publicKey: 'PCTX-31',
      projectKey: 'PRJ-204',
      content: '',
      createdAt: projectContext.createdAt,
      updatedAt: projectContext.updatedAt,
    });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('projectId');
  });

  it('upserts only submitted ProjectContext content without trimming it', async () => {
    const upsert = jest.fn().mockResolvedValue({
      ...projectContext,
      content: '  Shared project rules  ',
    });
    const service = new WorkspaceService({
      project: { findFirst: jest.fn().mockResolvedValue(project) },
      projectContext: { upsert },
    } as unknown as PrismaService);

    const result = await service.updateProjectContext(currentUser, 204, {
      content: '  Shared project rules  ',
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { projectId: currentUser.projectId },
      create: {
        projectId: currentUser.projectId,
        content: '  Shared project rules  ',
      },
      update: {
        content: '  Shared project rules  ',
      },
    });
    expect(result.content).toBe('  Shared project rules  ');
  });

  it('does not read or create ProjectContext outside the authorized Project', async () => {
    const upsert = jest.fn();
    const service = new WorkspaceService({
      project: { findFirst: jest.fn().mockResolvedValue(null) },
      projectContext: { upsert },
    } as unknown as PrismaService);

    await expect(
      service.getProjectContext(currentUser, 999),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.updateProjectContext(currentUser, 999, { content: 'Rejected' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(upsert).not.toHaveBeenCalled();
  });
});
