import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageObjectStatus } from '@prisma/client';

import type { StorageConfig } from '../config/storage.config';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ContextFileCleanupService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly config: StorageConfig;
  private readonly logger = new Logger(ContextFileCleanupService.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
  ) {
    this.config = configService.getOrThrow<StorageConfig>('storage');
  }

  onApplicationBootstrap(): void {
    void this.sweep();
    this.interval = setInterval(
      () => void this.sweep(),
      this.config.sweepIntervalSeconds * 1000,
    );
    this.interval.unref();
  }

  onModuleDestroy(): void {
    if (this.interval !== null) clearInterval(this.interval);
  }

  async sweep(): Promise<void> {
    try {
      const now = Date.now();
      const processingCutoff = new Date(
        now - this.config.processingTimeoutSeconds * 1000,
      );
      const failedCutoff = new Date(
        now - this.config.failedRetentionDays * 24 * 60 * 60 * 1000,
      );

      await this.prismaService.storageObject.updateMany({
        where: {
          status: StorageObjectStatus.processing,
          updatedAt: { lt: processingCutoff },
        },
        data: {
          failedAt: new Date(),
          failureCode: 'PROCESSING_TIMEOUT',
          failureMessage: 'File processing exceeded the configured timeout',
          selected: false,
          status: StorageObjectStatus.failed,
        },
      });

      const candidates = await this.prismaService.storageObject.findMany({
        where: {
          firstUsedAt: null,
          OR: [
            { purgeRequestedAt: { not: null } },
            {
              status: StorageObjectStatus.pending_upload,
              uploadExpiresAt: { lt: new Date() },
            },
            {
              status: StorageObjectStatus.failed,
              failedAt: { lt: failedCutoff },
            },
          ],
        },
        orderBy: { updatedAt: 'asc' },
        take: 100,
      });

      for (const candidate of candidates) {
        await this.purge(candidate).catch((error: unknown) => {
          this.logger.warn(
            `Could not purge ${candidate.publicNumber}: ${
              error instanceof Error ? error.message : 'unknown storage error'
            }`,
          );
        });
      }
    } catch (error: unknown) {
      this.logger.warn(
        `Context file cleanup sweep failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private async purge(storageObject: {
    readonly id: string;
    readonly preparedS3Key: string | null;
    readonly preparedS3VersionId: string | null;
    readonly s3Key: string;
    readonly s3VersionId: string | null;
    readonly uploadKey: string;
    readonly uploadVersionId: string | null;
  }): Promise<void> {
    await Promise.all([
      this.storageService.deleteObject(
        storageObject.uploadKey,
        storageObject.uploadVersionId,
      ),
      storageObject.s3VersionId
        ? this.storageService.deleteObject(
            storageObject.s3Key,
            storageObject.s3VersionId,
          )
        : Promise.resolve(),
      storageObject.preparedS3Key && storageObject.preparedS3VersionId
        ? this.storageService.deleteObject(
            storageObject.preparedS3Key,
            storageObject.preparedS3VersionId,
          )
        : Promise.resolve(),
    ]);

    await this.prismaService.storageObject.deleteMany({
      where: { id: storageObject.id, firstUsedAt: null },
    });
  }
}
