import { Injectable, NotFoundException } from '@nestjs/common';

import type { CurrentUserContext } from '../auth/current-user-context';
import {
  formatPublicKey,
  toIdentifierWhere,
  type EntityIdentifier,
} from '../common/public-identifiers';
import { PrismaService } from '../database/prisma.service';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';

export interface ProjectRecord {
  readonly id: string;
  readonly publicNumber: number;
  readonly organizationId: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

@Injectable()
export class WorkspaceService {
  constructor(private readonly prismaService: PrismaService) {}

  async getOrganization(
    currentUser: CurrentUserContext,
    organizationId: string,
  ) {
    this.assertOrganizationVisible(currentUser, organizationId);

    const organization = await this.prismaService.organization.findUnique({
      where: { id: organizationId },
    });

    if (organization === null) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async updateOrganization(
    currentUser: CurrentUserContext,
    organizationId: string,
    dto: UpdateOrganizationDto,
  ) {
    await this.getOrganization(currentUser, organizationId);

    return this.prismaService.organization.update({
      where: { id: organizationId },
      data: {
        name: dto.name.trim(),
      },
    });
  }

  async listProjects(currentUser: CurrentUserContext, organizationId: string) {
    this.assertOrganizationVisible(currentUser, organizationId);

    const projects = await this.prismaService.project.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        _count: {
          select: {
            features: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    return projects.map(({ _count, ...project }) => ({
      ...this.toProjectResponse(project),
      featureCount: _count.features,
    }));
  }

  async getProject(
    currentUser: CurrentUserContext,
    projectIdentifier: EntityIdentifier,
  ) {
    return this.toProjectResponse(
      await this.getProjectRecord(currentUser, projectIdentifier),
    );
  }

  async getProjectRecord(
    currentUser: CurrentUserContext,
    projectIdentifier: EntityIdentifier,
  ): Promise<ProjectRecord> {
    const project = await this.prismaService.project.findFirst({
      where: {
        organizationId: currentUser.organizationId,
        AND: [
          { id: currentUser.projectId },
          toIdentifierWhere(projectIdentifier),
        ],
      },
    });

    if (project === null) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async updateProject(
    currentUser: CurrentUserContext,
    projectId: string,
    dto: UpdateProjectDto,
  ) {
    await this.getProjectRecord(currentUser, {
      kind: 'uuid',
      value: projectId,
    });

    const project = await this.prismaService.project.update({
      where: {
        id: projectId,
      },
      data: {
        name: dto.name.trim(),
      },
    });

    return this.toProjectResponse(project);
  }

  private assertOrganizationVisible(
    currentUser: CurrentUserContext,
    organizationId: string,
  ): void {
    if (currentUser.organizationId !== organizationId) {
      throw new NotFoundException('Organization not found');
    }
  }

  private toProjectResponse(project: ProjectRecord) {
    return {
      id: project.id,
      publicKey: formatPublicKey('project', project.publicNumber),
      organizationId: project.organizationId,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
