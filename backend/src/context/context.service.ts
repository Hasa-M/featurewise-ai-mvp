import { Injectable, NotFoundException } from '@nestjs/common';

import type { CurrentUserContext } from '../auth/current-user-context';
import { formatPublicKey } from '../common/public-identifiers';
import { PrismaService } from '../database/prisma.service';
import { FeaturesService } from '../features/features.service';
import type { UpdateFeatureContextDto } from './dto/update-feature-context.dto';

@Injectable()
export class ContextService {
  constructor(
    private readonly featuresService: FeaturesService,
    private readonly prismaService: PrismaService,
  ) {}

  async getFeatureContext(
    currentUser: CurrentUserContext,
    featurePublicNumber: number,
  ) {
    const { contextArtifact, feature } = await this.getFeatureContextRecord(
      currentUser,
      featurePublicNumber,
    );

    return this.toFeatureContextResponse(contextArtifact, feature.publicNumber);
  }

  async updateFeatureContext(
    currentUser: CurrentUserContext,
    featurePublicNumber: number,
    dto: UpdateFeatureContextDto,
  ) {
    const { contextArtifact, feature } = await this.getFeatureContextRecord(
      currentUser,
      featurePublicNumber,
    );

    const updatedContextArtifact =
      await this.prismaService.contextArtifact.update({
        where: {
          id: contextArtifact.id,
        },
        data: {
          content: dto.content,
        },
      });

    return this.toFeatureContextResponse(
      updatedContextArtifact,
      feature.publicNumber,
    );
  }

  private async getFeatureContextRecord(
    currentUser: CurrentUserContext,
    featurePublicNumber: number,
  ) {
    const feature = await this.featuresService.getFeatureRecord(
      currentUser,
      featurePublicNumber,
    );

    const contextArtifact = await this.prismaService.contextArtifact.findUnique(
      {
        where: {
          featureId: feature.id,
        },
      },
    );

    if (contextArtifact === null) {
      throw new NotFoundException('Feature context not found');
    }

    return { contextArtifact, feature };
  }

  private toFeatureContextResponse(
    contextArtifact: {
      readonly publicNumber: number;
      readonly content: string;
      readonly createdAt: Date;
      readonly updatedAt: Date;
    },
    featurePublicNumber: number,
  ) {
    return {
      publicKey: formatPublicKey(
        'contextArtifact',
        contextArtifact.publicNumber,
      ),
      featureKey: formatPublicKey('feature', featurePublicNumber),
      featureUpdateKey: null,
      content: contextArtifact.content,
      createdAt: contextArtifact.createdAt,
      updatedAt: contextArtifact.updatedAt,
    };
  }
}
