import { Injectable, NotFoundException } from '@nestjs/common';

import type { CurrentUserContext } from '../auth/current-user-context';
import { PrismaService } from '../database/prisma.service';
import { FeaturesService } from '../features/features.service';
import type { UpdateFeatureContextDto } from './dto/update-feature-context.dto';

@Injectable()
export class ContextService {
  constructor(
    private readonly featuresService: FeaturesService,
    private readonly prismaService: PrismaService,
  ) {}

  async getFeatureContext(currentUser: CurrentUserContext, featureId: string) {
    await this.featuresService.getFeatureRecord(currentUser, featureId);

    const contextArtifact = await this.prismaService.contextArtifact.findUnique(
      {
        where: {
          featureId,
        },
      },
    );

    if (contextArtifact === null) {
      throw new NotFoundException('Feature context not found');
    }

    return contextArtifact;
  }

  async updateFeatureContext(
    currentUser: CurrentUserContext,
    featureId: string,
    dto: UpdateFeatureContextDto,
  ) {
    const contextArtifact = await this.getFeatureContext(
      currentUser,
      featureId,
    );

    return this.prismaService.contextArtifact.update({
      where: {
        id: contextArtifact.id,
      },
      data: {
        content: dto.content,
      },
    });
  }
}
