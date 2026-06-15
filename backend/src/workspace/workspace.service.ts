import { Injectable, NotFoundException } from '@nestjs/common';

import type { CurrentUserContext } from '../auth/current-user-context';
import { PrismaService } from '../database/prisma.service';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prismaService: PrismaService) {}

  async getOrganization(
    currentUser: CurrentUserContext,
    organizationId: string,
  ) {
    this.assertOrganizationScope(currentUser, organizationId);

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
    this.assertOrganizationScope(currentUser, organizationId);

    return this.prismaService.project.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getProject(
    currentUser: CurrentUserContext,
    organizationId: string,
    projectId: string,
  ) {
    this.assertProjectScope(currentUser, organizationId, projectId);

    const project = await this.prismaService.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (project === null) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async updateProject(
    currentUser: CurrentUserContext,
    organizationId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ) {
    await this.getProject(currentUser, organizationId, projectId);

    return this.prismaService.project.update({
      where: {
        id: projectId,
      },
      data: {
        name: dto.name.trim(),
      },
    });
  }

  private assertOrganizationScope(
    currentUser: CurrentUserContext,
    organizationId: string,
  ): void {
    if (currentUser.organizationId !== organizationId) {
      throw new NotFoundException('Organization not found');
    }
  }

  private assertProjectScope(
    currentUser: CurrentUserContext,
    organizationId: string,
    projectId: string,
  ): void {
    this.assertOrganizationScope(currentUser, organizationId);

    if (currentUser.projectId !== projectId) {
      throw new NotFoundException('Project not found');
    }
  }
}
