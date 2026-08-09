import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SpecRunKind, SpecRunStatus } from '@prisma/client';

import type { CurrentUserContext } from '../auth/current-user-context';
import {
  formatPublicKey,
  toIdentifierWhere,
  type EntityIdentifier,
} from '../common/public-identifiers';
import { PrismaService } from '../database/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import type { CreateFeatureDto } from './dto/create-feature.dto';
import type { UpdateFeatureDto } from './dto/update-feature.dto';

interface FeatureRecord {
  readonly id: string;
  readonly publicNumber: number;
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

export interface FeatureActivity {
  readonly currentValidSpecVersion: number | null;
  readonly generationRunCount: number;
  readonly latestFeatureRun: {
    readonly runKind: SpecRunKind;
    readonly status: SpecRunStatus;
    readonly usedProjectContext: boolean | null;
  } | null;
}

@Injectable()
export class FeaturesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  async listFeatures(
    currentUser: CurrentUserContext,
    projectIdentifier: EntityIdentifier,
  ) {
    const project = await this.workspaceService.getProjectRecord(
      currentUser,
      projectIdentifier,
    );

    const features = await this.prismaService.feature.findMany({
      where: {
        projectId: project.id,
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
    projectId: string,
    dto: CreateFeatureDto,
  ) {
    this.assertProjectVisible(currentUser, projectId);

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

  async getProjectFeature(
    currentUser: CurrentUserContext,
    projectIdentifier: EntityIdentifier,
    featureIdentifier: EntityIdentifier,
  ) {
    const project = await this.workspaceService.getProjectRecord(
      currentUser,
      projectIdentifier,
    );

    return this.toFeatureResponse(
      await this.getFeatureRecordByIdentifier(
        currentUser,
        featureIdentifier,
        project.id,
      ),
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
    return this.getFeatureRecordByIdentifier(
      currentUser,
      { kind: 'uuid', value: featureId },
      currentUser.projectId,
    );
  }

  private async getFeatureRecordByIdentifier(
    currentUser: CurrentUserContext,
    featureIdentifier: EntityIdentifier,
    projectId: string,
  ): Promise<FeatureRecord> {
    const feature = await this.prismaService.feature.findFirst({
      where: {
        ...toIdentifierWhere(featureIdentifier),
        deletedAt: null,
        projectId,
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

  private assertProjectVisible(
    currentUser: CurrentUserContext,
    projectId: string,
  ): void {
    if (currentUser.projectId !== projectId) {
      throw new NotFoundException('Project not found');
    }
  }

  private async toFeatureResponse(feature: FeatureRecord) {
    const [activity, alignment] = await Promise.all([
      this.computeActivity(feature.id),
      this.computeAlignment(feature.id),
    ]);

    return {
      id: feature.id,
      publicKey: formatPublicKey('feature', feature.publicNumber),
      projectId: feature.projectId,
      title: feature.title,
      brief: feature.brief,
      origin: feature.origin,
      includeInProjectContext: feature.includeInProjectContext,
      createdById: feature.createdById,
      createdAt: feature.createdAt,
      updatedAt: feature.updatedAt,
      activity,
      alignment,
    };
  }

  private async computeActivity(featureId: string): Promise<FeatureActivity> {
    const [generationRunCount, currentValidSpec, latestFeatureRun] =
      await Promise.all([
        this.prismaService.specRun.count({
          where: {
            featureId,
            featureUpdateId: null,
            runKind: SpecRunKind.generation,
          },
        }),
        this.prismaService.generatedSpec.findFirst({
          where: {
            featureId,
            featureUpdateId: null,
            valid: true,
          },
          select: {
            version: true,
          },
        }),
        this.prismaService.specRun.findFirst({
          where: {
            featureId,
            featureUpdateId: null,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            genSettings: true,
            runKind: true,
            status: true,
          },
        }),
      ]);

    return {
      currentValidSpecVersion: currentValidSpec?.version ?? null,
      generationRunCount,
      latestFeatureRun:
        latestFeatureRun === null
          ? null
          : {
              runKind: latestFeatureRun.runKind,
              status: latestFeatureRun.status,
              usedProjectContext: this.extractIncludeProjectSummary(
                latestFeatureRun.genSettings,
              ),
            },
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

  private extractIncludeProjectSummary(
    value: Prisma.JsonValue,
  ): boolean | null {
    if (!this.isJsonObject(value)) {
      return null;
    }

    return typeof value.includeProjectSummary === 'boolean'
      ? value.includeProjectSummary
      : null;
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
