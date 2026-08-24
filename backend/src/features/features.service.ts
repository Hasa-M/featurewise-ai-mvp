import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SpecRunKind, SpecRunStatus } from '@prisma/client';

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
  readonly brief: string | null;
  readonly origin: string;
  readonly includeInProjectContext: boolean;
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

export interface PendingUpdate {
  readonly featureUpdateKey: string;
  readonly generatedSpecKey: string;
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

    return Promise.all(
      features.map((feature) => this.toFeatureResponse(feature)),
    );
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
          brief: this.normalizeNullableText(dto.brief),
          createdById: currentUser.userId,
          includeInProjectContext: dto.includeInProjectContext ?? false,
          origin: dto.origin,
          projectId: project.id,
          title: dto.title.trim(),
          contextArtifact: {
            create: {
              promptContent: '',
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

  private async toFeatureResponse(feature: FeatureRecord) {
    const [activity, alignment] = await Promise.all([
      this.computeActivity(feature.id),
      this.computeAlignment(feature.id),
    ]);

    return {
      publicKey: formatPublicKey('feature', feature.publicNumber),
      projectKey: formatPublicKey('project', feature.project.publicNumber),
      title: feature.title,
      brief: feature.brief,
      origin: feature.origin,
      includeInProjectContext: feature.includeInProjectContext,
      createdByKey: formatPublicKey('user', feature.createdBy.publicNumber),
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
        publicNumber: true,
        title: true,
        generatedSpecs: {
          where: {
            valid: true,
          },
          select: {
            id: true,
            publicNumber: true,
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
          featureUpdateKey: formatPublicKey(
            'featureUpdate',
            update.publicNumber,
          ),
          generatedSpecKey: formatPublicKey(
            'generatedSpec',
            generatedSpec.publicNumber,
          ),
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
