import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SpecRunStatus } from '@prisma/client';

import type { CurrentUserContext } from '../auth/current-user-context';
import { PrismaService } from '../database/prisma.service';
import type { CreateFeatureDto } from './dto/create-feature.dto';
import type { UpdateFeatureDto } from './dto/update-feature.dto';

interface FeatureRecord {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly brief: string | null;
  readonly origin: string;
  readonly includeInProjectContext: boolean;
  readonly createdById: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PendingUpdate {
  readonly featureUpdateId: string;
  readonly generatedSpecId: string;
  readonly title: string;
  readonly version: number;
}

export interface FeatureAlignment {
  readonly status: 'aligned' | 'updates_pending';
  readonly pendingUpdates: PendingUpdate[];
}

@Injectable()
export class FeaturesService {
  constructor(private readonly prismaService: PrismaService) {}

  async listFeatures(
    currentUser: CurrentUserContext,
    organizationId: string,
    projectId: string,
  ) {
    await this.ensureProjectScope(currentUser, organizationId, projectId);

    const features = await this.prismaService.feature.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Promise.all(
      features.map((feature) => this.toFeatureResponse(feature)),
    );
  }

  async createFeature(
    currentUser: CurrentUserContext,
    organizationId: string,
    projectId: string,
    dto: CreateFeatureDto,
  ) {
    await this.ensureProjectScope(currentUser, organizationId, projectId);

    const feature = await this.prismaService.$transaction((transaction) =>
      transaction.feature.create({
        data: {
          brief: this.normalizeNullableText(dto.brief),
          createdById: currentUser.userId,
          includeInProjectContext: dto.includeInProjectContext ?? false,
          origin: dto.origin,
          projectId,
          title: dto.title.trim(),
          contextArtifact: {
            create: {
              content: '',
            },
          },
        },
      }),
    );

    return this.toFeatureResponse(feature);
  }

  async getFeature(currentUser: CurrentUserContext, featureId: string) {
    return this.toFeatureResponse(
      await this.getFeatureRecord(currentUser, featureId),
    );
  }

  async updateFeature(
    currentUser: CurrentUserContext,
    featureId: string,
    dto: UpdateFeatureDto,
  ) {
    await this.getFeatureRecord(currentUser, featureId);

    const data: Prisma.FeatureUpdateInput = {};

    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }

    if (dto.brief !== undefined) {
      data.brief = this.normalizeNullableText(dto.brief);
    }

    if (dto.includeInProjectContext !== undefined) {
      data.includeInProjectContext = dto.includeInProjectContext;
    }

    const feature = await this.prismaService.feature.update({
      where: {
        id: featureId,
      },
      data,
    });

    return this.toFeatureResponse(feature);
  }

  async deleteFeature(
    currentUser: CurrentUserContext,
    featureId: string,
  ): Promise<void> {
    const feature = await this.getFeatureRecord(currentUser, featureId);
    const activeRun = await this.prismaService.specRun.findFirst({
      where: {
        featureId: feature.id,
        status: {
          notIn: [SpecRunStatus.completed, SpecRunStatus.failed],
        },
      },
      select: {
        id: true,
      },
    });

    if (activeRun !== null) {
      throw new ConflictException(
        'Feature cannot be deleted while a spec run is active',
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
    featureId: string,
  ): Promise<FeatureRecord> {
    const feature = await this.prismaService.feature.findFirst({
      where: {
        id: featureId,
        projectId: currentUser.projectId,
        deletedAt: null,
        project: {
          organizationId: currentUser.organizationId,
        },
      },
    });

    if (feature === null) {
      throw new NotFoundException('Feature not found');
    }

    return feature;
  }

  private async ensureProjectScope(
    currentUser: CurrentUserContext,
    organizationId: string,
    projectId: string,
  ): Promise<void> {
    if (
      currentUser.organizationId !== organizationId ||
      currentUser.projectId !== projectId
    ) {
      throw new NotFoundException('Project not found');
    }

    const project = await this.prismaService.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (project === null) {
      throw new NotFoundException('Project not found');
    }
  }

  private async toFeatureResponse(feature: FeatureRecord) {
    return {
      id: feature.id,
      projectId: feature.projectId,
      title: feature.title,
      brief: feature.brief,
      origin: feature.origin,
      includeInProjectContext: feature.includeInProjectContext,
      createdById: feature.createdById,
      createdAt: feature.createdAt,
      updatedAt: feature.updatedAt,
      alignment: await this.computeAlignment(feature.id),
    };
  }

  private async computeAlignment(featureId: string): Promise<FeatureAlignment> {
    const validFeatureSpec = await this.prismaService.generatedSpec.findFirst({
      where: {
        featureId,
        featureUpdateId: null,
        valid: true,
      },
      select: {
        incorporatedUpdates: true,
      },
    });
    const updateSpecs = await this.prismaService.featureUpdate.findMany({
      where: {
        featureId,
        deletedAt: null,
        generatedSpecs: {
          some: {
            valid: true,
          },
        },
      },
      select: {
        id: true,
        title: true,
        generatedSpecs: {
          where: {
            valid: true,
          },
          select: {
            id: true,
            version: true,
          },
          take: 1,
        },
      },
    });

    if (updateSpecs.length === 0) {
      return {
        pendingUpdates: [],
        status: 'aligned',
      };
    }

    const incorporatedSpecIds =
      validFeatureSpec === null
        ? new Set<string>()
        : this.extractIncorporatedSpecIds(validFeatureSpec.incorporatedUpdates);
    const pendingUpdates = updateSpecs.flatMap<PendingUpdate>((update) => {
      const generatedSpec = update.generatedSpecs[0];

      if (
        generatedSpec === undefined ||
        incorporatedSpecIds.has(generatedSpec.id)
      ) {
        return [];
      }

      return [
        {
          featureUpdateId: update.id,
          generatedSpecId: generatedSpec.id,
          title: update.title,
          version: generatedSpec.version,
        },
      ];
    });

    return {
      pendingUpdates,
      status: pendingUpdates.length > 0 ? 'updates_pending' : 'aligned',
    };
  }

  private extractIncorporatedSpecIds(value: Prisma.JsonValue): Set<string> {
    if (!Array.isArray(value)) {
      return new Set<string>();
    }

    const specIds = value.flatMap((item) => {
      if (!this.isJsonObject(item)) {
        return [];
      }

      const generatedSpecId = item.generatedSpecId;

      return typeof generatedSpecId === 'string' ? [generatedSpecId] : [];
    });

    return new Set(specIds);
  }

  private isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private normalizeNullableText(
    value: string | null | undefined,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue === '' ? null : trimmedValue;
  }
}
