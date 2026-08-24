import { Injectable, NotFoundException } from '@nestjs/common';

import type { CurrentUserContext } from '../auth/current-user-context';
import { PrismaService } from '../database/prisma.service';

export interface FeatureUpdateRecord {
  readonly id: string;
  readonly publicNumber: number;
  readonly title: string;
  readonly brief: string | null;
  readonly feature: {
    readonly id: string;
    readonly publicNumber: number;
    readonly project: {
      readonly publicNumber: number;
    };
  };
}

@Injectable()
export class FeatureUpdatesService {
  constructor(private readonly prismaService: PrismaService) {}

  async getFeatureUpdateRecord(
    currentUser: CurrentUserContext,
    featureUpdatePublicNumber: number,
  ): Promise<FeatureUpdateRecord> {
    const featureUpdate = await this.prismaService.featureUpdate.findFirst({
      where: {
        publicNumber: featureUpdatePublicNumber,
        deletedAt: null,
        feature: {
          deletedAt: null,
          projectId: currentUser.projectId,
          project: {
            organizationId: currentUser.organizationId,
          },
        },
      },
      select: {
        id: true,
        publicNumber: true,
        title: true,
        brief: true,
        feature: {
          select: {
            id: true,
            publicNumber: true,
            project: {
              select: {
                publicNumber: true,
              },
            },
          },
        },
      },
    });

    if (featureUpdate === null) {
      throw new NotFoundException('Feature update not found');
    }

    return featureUpdate;
  }
}
