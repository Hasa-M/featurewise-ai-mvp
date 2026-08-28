import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnalysisRunStatus } from '@prisma/client';

import type { CurrentUserContext } from '../auth/current-user-context';
import { formatPublicKey } from '../common/public-identifiers';
import { PrismaService } from '../database/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import type { CreateFeatureDto } from './dto/create-feature.dto';
import type { UpdateFeatureDto } from './dto/update-feature.dto';

interface FeatureRecord {
  readonly id: string;
  readonly publicNumber: number;
  readonly projectId: string;
  readonly title: string;
  readonly specificationContent: string;
  readonly createdById: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: {
    readonly publicNumber: number;
  };
  readonly project: {
    readonly publicNumber: number;
  };
}

@Injectable()
export class FeaturesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  async listFeatures(
    currentUser: CurrentUserContext,
    projectPublicNumber: number,
  ) {
    const project = await this.workspaceService.getProjectRecord(
      currentUser,
      projectPublicNumber,
    );

    const features = await this.prismaService.feature.findMany({
      where: {
        projectId: project.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: this.featurePublicRelations(),
    });

    return features.map((feature) => this.toFeatureResponse(feature));
  }

  async createFeature(
    currentUser: CurrentUserContext,
    projectPublicNumber: number,
    dto: CreateFeatureDto,
  ) {
    const project = await this.workspaceService.getProjectRecord(
      currentUser,
      projectPublicNumber,
    );

    const feature = await this.prismaService.$transaction((transaction) =>
      transaction.feature.create({
        data: {
          createdById: currentUser.userId,
          projectId: project.id,
          specificationContent: dto.specificationContent?.trim() ?? '',
          title: dto.title.trim(),
          contextArtifact: {
            create: {
              content: '',
            },
          },
        },
        include: this.featurePublicRelations(),
      }),
    );

    return this.toFeatureResponse(feature);
  }

  async getFeature(
    currentUser: CurrentUserContext,
    featurePublicNumber: number,
  ) {
    return this.toFeatureResponse(
      await this.getFeatureRecord(currentUser, featurePublicNumber),
    );
  }

  async getProjectFeature(
    currentUser: CurrentUserContext,
    projectPublicNumber: number,
    featurePublicNumber: number,
  ) {
    const project = await this.workspaceService.getProjectRecord(
      currentUser,
      projectPublicNumber,
    );

    return this.toFeatureResponse(
      await this.getFeatureRecordByPublicNumber(
        currentUser,
        featurePublicNumber,
        project.id,
      ),
    );
  }

  async updateFeature(
    currentUser: CurrentUserContext,
    featurePublicNumber: number,
    dto: UpdateFeatureDto,
  ) {
    const featureRecord = await this.getFeatureRecord(
      currentUser,
      featurePublicNumber,
    );

    const data: { specificationContent?: string; title?: string } = {};

    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }

    if (dto.specificationContent !== undefined) {
      data.specificationContent = dto.specificationContent.trim();
    }

    const feature = await this.prismaService.feature.update({
      where: {
        id: featureRecord.id,
      },
      data,
      include: this.featurePublicRelations(),
    });

    return this.toFeatureResponse(feature);
  }

  async deleteFeature(
    currentUser: CurrentUserContext,
    featurePublicNumber: number,
  ): Promise<void> {
    const feature = await this.getFeatureRecord(
      currentUser,
      featurePublicNumber,
    );
    const activeRun = await this.prismaService.analysisRun.findFirst({
      where: {
        featureId: feature.id,
        status: {
          notIn: [AnalysisRunStatus.completed, AnalysisRunStatus.failed],
        },
      },
      select: {
        id: true,
      },
    });

    if (activeRun !== null) {
      throw new ConflictException(
        'Feature cannot be deleted while a run is active',
      );
    }

    await this.prismaService.feature.update({
      where: {
        id: feature.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async getFeatureRecord(
    currentUser: CurrentUserContext,
    featurePublicNumber: number,
  ): Promise<FeatureRecord> {
    return this.getFeatureRecordByPublicNumber(
      currentUser,
      featurePublicNumber,
      currentUser.projectId,
    );
  }

  private async getFeatureRecordByPublicNumber(
    currentUser: CurrentUserContext,
    featurePublicNumber: number,
    projectId: string,
  ): Promise<FeatureRecord> {
    const feature = await this.prismaService.feature.findFirst({
      where: {
        publicNumber: featurePublicNumber,
        deletedAt: null,
        projectId,
        project: {
          organizationId: currentUser.organizationId,
        },
      },
      include: this.featurePublicRelations(),
    });

    if (feature === null) {
      throw new NotFoundException('Feature not found');
    }

    return feature;
  }

  private toFeatureResponse(feature: FeatureRecord) {
    return {
      publicKey: formatPublicKey('feature', feature.publicNumber),
      projectKey: formatPublicKey('project', feature.project.publicNumber),
      title: feature.title,
      specificationContent: feature.specificationContent,
      createdByKey: formatPublicKey('user', feature.createdBy.publicNumber),
      createdAt: feature.createdAt,
      updatedAt: feature.updatedAt,
    };
  }

  private featurePublicRelations() {
    return {
      createdBy: {
        select: {
          publicNumber: true,
        },
      },
      project: {
        select: {
          publicNumber: true,
        },
      },
    } as const;
  }
}
