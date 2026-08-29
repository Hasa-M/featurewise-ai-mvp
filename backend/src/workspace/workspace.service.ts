import { Injectable, NotFoundException } from '@nestjs/common';

import type { CurrentUserContext } from '../auth/current-user-context';
import { formatPublicKey } from '../common/public-identifiers';
import { PrismaService } from '../database/prisma.service';
import type { ProjectContextResponseDto } from './dto/project-context-response.dto';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';
import type { UpdateProjectContextDto } from './dto/update-project-context.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';

export interface ProjectRecord {
  readonly id: string;
  readonly publicNumber: number;
  readonly organizationId: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface OrganizationRecord {
  readonly id: string;
  readonly publicNumber: number;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface ProjectContextRecord {
  readonly publicNumber: number;
  readonly projectId: string;
  readonly content: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

@Injectable()
export class WorkspaceService {
  constructor(private readonly prismaService: PrismaService) {}

  async getOrganization(
    currentUser: CurrentUserContext,
    organizationPublicNumber: number,
  ) {
    return this.toOrganizationResponse(
      await this.getOrganizationRecord(currentUser, organizationPublicNumber),
    );
  }

  async updateOrganization(
    currentUser: CurrentUserContext,
    organizationPublicNumber: number,
    dto: UpdateOrganizationDto,
  ) {
    const organization = await this.getOrganizationRecord(
      currentUser,
      organizationPublicNumber,
    );

    const updatedOrganization = await this.prismaService.organization.update({
      where: { id: organization.id },
      data: {
        name: dto.name.trim(),
      },
    });

    return this.toOrganizationResponse(updatedOrganization);
  }

  async listProjects(
    currentUser: CurrentUserContext,
    organizationPublicNumber: number,
  ) {
    const organization = await this.getOrganizationRecord(
      currentUser,
      organizationPublicNumber,
    );

    const projects = await this.prismaService.project.findMany({
      where: {
        organizationId: organization.id,
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
      ...this.toProjectResponse(
        project,
        formatPublicKey('organization', organization.publicNumber),
      ),
      featureCount: _count.features,
    }));
  }

  async getProject(
    currentUser: CurrentUserContext,
    projectPublicNumber: number,
  ) {
    return this.toProjectResponse(
      await this.getProjectRecord(currentUser, projectPublicNumber),
      currentUser.organizationKey,
    );
  }

  async getProjectRecord(
    currentUser: CurrentUserContext,
    projectPublicNumber: number,
  ): Promise<ProjectRecord> {
    const project = await this.prismaService.project.findFirst({
      where: {
        organizationId: currentUser.organizationId,
        id: currentUser.projectId,
        publicNumber: projectPublicNumber,
      },
    });

    if (project === null) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async getProjectContext(
    currentUser: CurrentUserContext,
    projectPublicNumber: number,
  ): Promise<ProjectContextResponseDto> {
    const project = await this.getProjectRecord(
      currentUser,
      projectPublicNumber,
    );
    const projectContext = await this.prismaService.projectContext.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        content: '',
      },
      update: {},
    });

    return this.toProjectContextResponse(projectContext, project.publicNumber);
  }

  async updateProjectContext(
    currentUser: CurrentUserContext,
    projectPublicNumber: number,
    dto: UpdateProjectContextDto,
  ): Promise<ProjectContextResponseDto> {
    const project = await this.getProjectRecord(
      currentUser,
      projectPublicNumber,
    );
    const projectContext = await this.prismaService.projectContext.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        content: dto.content,
      },
      update: {
        content: dto.content,
      },
    });

    return this.toProjectContextResponse(projectContext, project.publicNumber);
  }

  async updateProject(
    currentUser: CurrentUserContext,
    projectPublicNumber: number,
    dto: UpdateProjectDto,
  ) {
    const projectRecord = await this.getProjectRecord(
      currentUser,
      projectPublicNumber,
    );

    const project = await this.prismaService.project.update({
      where: {
        id: projectRecord.id,
      },
      data: {
        name: dto.name.trim(),
      },
    });

    return this.toProjectResponse(project, currentUser.organizationKey);
  }

  private async getOrganizationRecord(
    currentUser: CurrentUserContext,
    organizationPublicNumber: number,
  ): Promise<OrganizationRecord> {
    const organization = await this.prismaService.organization.findFirst({
      where: {
        id: currentUser.organizationId,
        publicNumber: organizationPublicNumber,
      },
    });

    if (organization === null) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  private toOrganizationResponse(organization: OrganizationRecord) {
    return {
      publicKey: formatPublicKey('organization', organization.publicNumber),
      name: organization.name,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  private toProjectResponse(project: ProjectRecord, organizationKey: string) {
    return {
      publicKey: formatPublicKey('project', project.publicNumber),
      organizationKey,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private toProjectContextResponse(
    projectContext: ProjectContextRecord,
    projectPublicNumber: number,
  ): ProjectContextResponseDto {
    return {
      publicKey: formatPublicKey('projectContext', projectContext.publicNumber),
      projectKey: formatPublicKey('project', projectPublicNumber),
      content: projectContext.content,
      createdAt: projectContext.createdAt,
      updatedAt: projectContext.updatedAt,
    };
  }
}
