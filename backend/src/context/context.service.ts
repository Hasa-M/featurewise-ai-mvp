import {
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AssetType, Prisma, StorageObjectStatus } from '@prisma/client';

import type { CurrentUserContext } from '../auth/current-user-context';
import { formatPublicKey, parsePublicKey } from '../common/public-identifiers';
import { PrismaService } from '../database/prisma.service';
import { FeaturesService } from '../features/features.service';
import { StorageService } from '../storage/storage.service';
import {
  MAX_SELECTED_BYTES,
  MAX_SELECTED_FILES,
  MAX_TOTAL_FILES,
  resolveContextFilePolicy,
} from './context-file-policy';
import { ContextFileProcessorService } from './context-file-processor.service';
import type { CreateContextFileDto } from './dto/create-context-file.dto';
import type { ListContextFilesQueryDto } from './dto/list-context-files-query.dto';
import type { UpdateFeatureContextDto } from './dto/update-feature-context.dto';

interface ContextOwnerRecord {
  readonly contextArtifact: {
    readonly id: string;
    readonly publicNumber: number;
    readonly content: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  };
  readonly projectPublicNumber: number;
}

export interface StorageObjectResponse {
  readonly assetType: AssetType;
  readonly canDeletePermanently: boolean;
  readonly createdAt: Date;
  readonly failure: {
    readonly code: string;
    readonly message: string | null;
  } | null;
  readonly filename: string;
  readonly mimeType: string;
  readonly publicKey: string;
  readonly readyAt: Date | null;
  readonly selected: boolean;
  readonly sizeBytes: number;
  readonly status: StorageObjectStatus;
  readonly updatedAt: Date;
}

@Injectable()
export class ContextService {
  constructor(
    private readonly featuresService: FeaturesService,
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
    private readonly fileProcessor: ContextFileProcessorService,
  ) {}

  async getFeatureContext(
    currentUser: CurrentUserContext,
    featurePublicNumber: number,
  ) {
    const { contextArtifact, feature } = await this.getFeatureContextRecord(
      currentUser,
      featurePublicNumber,
    );

    return this.toContextResponse(contextArtifact, feature.publicNumber);
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

    return this.toContextResponse(updatedContextArtifact, feature.publicNumber);
  }

  async createFeatureContextFile(
    currentUser: CurrentUserContext,
    featurePublicNumber: number,
    dto: CreateContextFileDto,
  ) {
    const owner = await this.getFeatureContextOwner(
      currentUser,
      featurePublicNumber,
    );

    return this.createContextFile(currentUser, owner, dto);
  }

  async listFeatureContextArchive(
    currentUser: CurrentUserContext,
    featurePublicNumber: number,
    query: ListContextFilesQueryDto,
  ) {
    const owner = await this.getFeatureContextOwner(
      currentUser,
      featurePublicNumber,
    );

    return this.listContextArchive(owner.contextArtifact.id, query);
  }

  async confirmStorageObject(
    currentUser: CurrentUserContext,
    storageObjectPublicNumber: number,
  ): Promise<{
    readonly accepted: boolean;
    readonly file: StorageObjectResponse;
  }> {
    let copiedOriginalVersionId: string | null = null;
    const storageObject = await this.getStorageObjectRecord(
      currentUser,
      storageObjectPublicNumber,
    );

    if (storageObject.status === StorageObjectStatus.ready) {
      return {
        accepted: false,
        file: this.toStorageObjectResponse(storageObject),
      };
    }

    if (storageObject.status === StorageObjectStatus.processing) {
      return {
        accepted: true,
        file: this.toStorageObjectResponse(storageObject),
      };
    }

    if (storageObject.status === StorageObjectStatus.failed) {
      throw new ConflictException('Failed files require a new upload');
    }

    const claimed = await this.prismaService.storageObject.updateMany({
      where: {
        id: storageObject.id,
        purgeRequestedAt: null,
        status: StorageObjectStatus.pending_upload,
      },
      data: {
        confirmedAt: new Date(),
        status: StorageObjectStatus.processing,
      },
    });

    if (claimed.count === 0) {
      return this.confirmStorageObject(currentUser, storageObjectPublicNumber);
    }

    try {
      const head = await this.storageService.headObject(
        storageObject.uploadKey,
      );

      if (
        head.contentLength !== Number(storageObject.sizeBytes) ||
        head.contentType !== storageObject.mimeType ||
        head.checksumSha256 !== storageObject.checksumSha256
      ) {
        throw new UnprocessableEntityException(
          'Uploaded file metadata does not match the request',
        );
      }

      if (head.versionId === null) {
        throw new UnprocessableEntityException(
          'S3 bucket versioning is required for confirmed files',
        );
      }

      const copied = await this.storageService.copyObject({
        checksumSha256: storageObject.checksumSha256,
        contentType: storageObject.mimeType,
        destinationKey: storageObject.s3Key,
        sourceKey: storageObject.uploadKey,
        sourceVersionId: head.versionId,
      });

      if (copied.versionId === null) {
        throw new UnprocessableEntityException(
          'S3 bucket versioning is required for confirmed files',
        );
      }
      copiedOriginalVersionId = copied.versionId;

      const persisted = await this.prismaService.storageObject.updateMany({
        where: {
          id: storageObject.id,
          purgeRequestedAt: null,
          status: StorageObjectStatus.processing,
        },
        data: {
          etag: copied.etag,
          s3VersionId: copied.versionId,
          uploadVersionId: head.versionId,
        },
      });

      if (persisted.count !== 1) {
        throw new ConflictException(
          'File deletion started while the upload was being confirmed',
        );
      }

      const updated = await this.prismaService.storageObject.findUnique({
        where: { id: storageObject.id },
      });

      if (updated === null) {
        throw new ConflictException('File was deleted during confirmation');
      }

      void this.storageService
        .deleteObject(storageObject.uploadKey, head.versionId)
        .catch(() => undefined);
      this.fileProcessor.start(storageObject.id);

      return { accepted: true, file: this.toStorageObjectResponse(updated) };
    } catch (error: unknown) {
      if (copiedOriginalVersionId !== null) {
        await this.storageService
          .deleteObject(storageObject.s3Key, copiedOriginalVersionId)
          .catch(() => undefined);
      }
      await this.prismaService.storageObject.updateMany({
        where: { id: storageObject.id },
        data: {
          failedAt: new Date(),
          failureCode: 'CONFIRMATION_FAILED',
          failureMessage:
            error instanceof Error
              ? error.message.slice(0, 500)
              : 'Confirmation failed',
          selected: false,
          status: StorageObjectStatus.failed,
        },
      });
      throw error;
    }
  }

  async updateStorageObjectSelection(
    currentUser: CurrentUserContext,
    storageObjectPublicNumber: number,
    selected: boolean,
  ) {
    const storageObject = await this.getStorageObjectRecord(
      currentUser,
      storageObjectPublicNumber,
    );

    const updated = await this.prismaService.$transaction(
      async (transaction) => {
        await this.lockContextArtifact(
          transaction,
          storageObject.contextArtifactId,
        );
        const current = await transaction.storageObject.findUnique({
          where: { id: storageObject.id },
        });

        if (
          current === null ||
          current.status !== StorageObjectStatus.ready ||
          current.purgeRequestedAt !== null
        ) {
          throw new ConflictException('Only ready files can change selection');
        }

        if (current.selected === selected) return current;

        if (selected) {
          await this.assertSelectedLimits(
            transaction,
            current.contextArtifactId,
            Number(current.sizeBytes),
          );
        }

        return transaction.storageObject.update({
          where: { id: current.id },
          data: {
            selected,
            unselectedAt: selected ? null : new Date(),
          },
        });
      },
    );

    return this.toStorageObjectResponse(updated);
  }

  async createStorageObjectAccessUrl(
    currentUser: CurrentUserContext,
    storageObjectPublicNumber: number,
    disposition: 'inline' | 'attachment',
  ) {
    const storageObject = await this.getStorageObjectRecord(
      currentUser,
      storageObjectPublicNumber,
    );

    if (
      storageObject.status !== StorageObjectStatus.ready ||
      storageObject.purgeRequestedAt !== null ||
      storageObject.s3VersionId === null
    ) {
      throw new ConflictException('File is not available');
    }

    const safeInline =
      storageObject.mimeType === 'application/pdf' ||
      ['image/png', 'image/jpeg', 'image/webp'].includes(
        storageObject.mimeType,
      );
    const effectiveDisposition =
      disposition === 'inline' && safeInline ? 'inline' : 'attachment';
    const filename = storageObject.originalFilename.replaceAll('"', '');
    const access = await this.storageService.createAccessUrl({
      contentDisposition: `${effectiveDisposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      key: storageObject.s3Key,
      versionId: storageObject.s3VersionId,
    });

    return { ...access, disposition: effectiveDisposition };
  }

  async purgeStorageObject(
    currentUser: CurrentUserContext,
    storageObjectPublicNumber: number,
  ): Promise<void> {
    const storageObject = await this.getStorageObjectRecord(
      currentUser,
      storageObjectPublicNumber,
    );

    const purgeCandidate = await this.prismaService.$transaction(
      async (transaction) => {
        await this.lockContextArtifact(
          transaction,
          storageObject.contextArtifactId,
        );
        const current = await transaction.storageObject.findUnique({
          where: { id: storageObject.id },
        });

        if (current === null || current.purgeRequestedAt !== null) {
          throw new ConflictException('File is already being deleted');
        }

        if (current.selected && current.status === StorageObjectStatus.ready) {
          throw new ConflictException(
            'Unselect the file before permanent deletion',
          );
        }

        if (current.firstUsedAt !== null) {
          throw new ConflictException(
            'Files used by an analysis run cannot be permanently deleted',
          );
        }

        const marked = await transaction.storageObject.updateMany({
          where: {
            id: current.id,
            firstUsedAt: null,
            purgeRequestedAt: null,
            ...(current.status === StorageObjectStatus.ready
              ? { selected: false }
              : {}),
          },
          data: { purgeRequestedAt: new Date(), selected: false },
        });

        if (marked.count !== 1) {
          throw new ConflictException(
            'File selection or historical usage changed; refresh and try again',
          );
        }

        return current;
      },
    );

    void this.purgeStorageObjectBytes(purgeCandidate).catch(() => undefined);
  }

  async buildContextArtifactSnapshot(
    transaction: Prisma.TransactionClient,
    contextArtifactId: string,
  ) {
    await this.lockContextArtifact(transaction, contextArtifactId);
    const contextArtifact = await transaction.contextArtifact.findUnique({
      where: { id: contextArtifactId },
      include: {
        feature: {
          select: { specificationContent: true, title: true },
        },
        storageObjects: {
          where: {
            purgeRequestedAt: null,
            selected: true,
            status: StorageObjectStatus.ready,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (contextArtifact === null) {
      throw new NotFoundException('Context not found');
    }

    const now = new Date();
    const fileIds = contextArtifact.storageObjects.map((file) => file.id);

    if (fileIds.length > 0) {
      const markedUsed = await Promise.all(
        contextArtifact.storageObjects.map((file) =>
          transaction.storageObject.updateMany({
            where: {
              id: file.id,
              purgeRequestedAt: null,
              selected: true,
              status: StorageObjectStatus.ready,
            },
            data: { firstUsedAt: file.firstUsedAt ?? now },
          }),
        ),
      );

      if (markedUsed.some((result) => result.count !== 1)) {
        throw new ConflictException(
          'Context files changed while the snapshot was being created',
        );
      }
    }

    const storageObjects = contextArtifact.storageObjects.map((file) => {
      if (file.s3VersionId === null || file.preparationVersion === null) {
        throw new ConflictException('Ready file metadata is incomplete');
      }

      const usesPrepared =
        file.preparedS3Key !== null &&
        file.preparedS3VersionId !== null &&
        file.preparedMimeType !== null &&
        file.preparedSizeBytes !== null &&
        file.preparedChecksumSha256 !== null;

      return {
        storageObjectId: file.id,
        assetType: file.assetType,
        originalFilename: file.originalFilename,
        original: {
          s3Key: file.s3Key,
          s3VersionId: file.s3VersionId,
          mimeType: file.mimeType,
          sizeBytes: Number(file.sizeBytes),
          checksumSha256: file.checksumSha256,
        },
        modelInput: usesPrepared
          ? {
              s3Key: file.preparedS3Key,
              s3VersionId: file.preparedS3VersionId,
              mimeType: file.preparedMimeType,
              sizeBytes: Number(file.preparedSizeBytes),
              checksumSha256: file.preparedChecksumSha256,
              preparationVersion: file.preparationVersion,
            }
          : {
              s3Key: file.s3Key,
              s3VersionId: file.s3VersionId,
              mimeType: file.mimeType,
              sizeBytes: Number(file.sizeBytes),
              checksumSha256: file.checksumSha256,
              preparationVersion: file.preparationVersion,
            },
      };
    });
    const modelInputBytes = storageObjects.reduce(
      (total, file) => total + file.modelInput.sizeBytes,
      0,
    );

    if (modelInputBytes > 50 * 1024 * 1024) {
      throw new UnprocessableEntityException(
        'Selected files exceed the model provider combined input limit',
      );
    }

    return {
      title: contextArtifact.feature.title,
      specificationContent: contextArtifact.feature.specificationContent,
      content: contextArtifact.content,
      storageObjects,
    };
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
        where: { featureId: feature.id },
      },
    );

    if (contextArtifact === null) {
      throw new NotFoundException('Feature context not found');
    }

    return { contextArtifact, feature };
  }

  private async getFeatureContextOwner(
    currentUser: CurrentUserContext,
    featurePublicNumber: number,
  ): Promise<ContextOwnerRecord> {
    const { contextArtifact, feature } = await this.getFeatureContextRecord(
      currentUser,
      featurePublicNumber,
    );

    return {
      contextArtifact,
      projectPublicNumber: feature.project.publicNumber,
    };
  }

  private async createContextFile(
    currentUser: CurrentUserContext,
    owner: ContextOwnerRecord,
    dto: CreateContextFileDto,
  ) {
    const policy = resolveContextFilePolicy(dto.filename, dto.mimeType);
    const contextKey = formatPublicKey(
      'contextArtifact',
      owner.contextArtifact.publicNumber,
    );
    const keys = this.storageService.createContextKeys({
      contextKey,
      organizationKey: currentUser.organizationKey,
      projectKey: formatPublicKey('project', owner.projectPublicNumber),
    });
    const upload = await this.storageService.createUpload({
      checksumSha256: dto.checksumSha256,
      contentType: policy.canonicalMimeType,
      key: keys.uploadKey,
      maxBytes: dto.sizeBytes,
    });
    const storageObject = await this.prismaService.$transaction(
      async (transaction) => {
        await this.lockContextArtifact(transaction, owner.contextArtifact.id);
        await this.assertCreateLimits(
          transaction,
          owner.contextArtifact.id,
          dto.sizeBytes,
        );

        return transaction.storageObject.create({
          data: {
            assetType: policy.assetType,
            checksumSha256: dto.checksumSha256,
            contextArtifactId: owner.contextArtifact.id,
            createdById: currentUser.userId,
            mimeType: policy.canonicalMimeType,
            originalFilename: policy.filename,
            s3Key: keys.originalKey,
            selected: true,
            sizeBytes: BigInt(dto.sizeBytes),
            status: StorageObjectStatus.pending_upload,
            uploadExpiresAt: upload.expiresAt,
            uploadKey: keys.uploadKey,
          },
        });
      },
    );

    return {
      file: this.toStorageObjectResponse(storageObject),
      upload: {
        expiresAt: upload.expiresAt,
        fields: upload.fields,
        url: upload.url,
      },
    };
  }

  private async listContextArchive(
    contextArtifactId: string,
    query: ListContextFilesQueryDto,
  ) {
    const limit = query.limit ?? 20;
    const cursorPublicNumber = query.cursor
      ? parsePublicKey('storageObject', query.cursor)
      : undefined;
    const rows = await this.prismaService.storageObject.findMany({
      where: {
        contextArtifactId,
        purgeRequestedAt: null,
        selected: false,
        status: StorageObjectStatus.ready,
        originalFilename: query.query
          ? { contains: query.query, mode: 'insensitive' }
          : undefined,
        publicNumber: cursorPublicNumber
          ? { lt: cursorPublicNumber }
          : undefined,
      },
      orderBy: { publicNumber: 'desc' },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    return {
      files: page.map((row) => this.toStorageObjectResponse(row)),
      nextCursor: hasMore
        ? formatPublicKey('storageObject', page.at(-1)?.publicNumber ?? 0)
        : null,
    };
  }

  private async getStorageObjectRecord(
    currentUser: CurrentUserContext,
    publicNumber: number,
  ) {
    const storageObject = await this.prismaService.storageObject.findFirst({
      where: {
        publicNumber,
        contextArtifact: {
          feature: {
            deletedAt: null,
            projectId: currentUser.projectId,
            project: { organizationId: currentUser.organizationId },
          },
        },
      },
    });

    if (storageObject === null) {
      throw new NotFoundException('File not found');
    }

    return storageObject;
  }

  private async assertCreateLimits(
    transaction: Prisma.TransactionClient,
    contextArtifactId: string,
    newFileBytes: number,
  ): Promise<void> {
    const [totalFiles, selected] = await Promise.all([
      transaction.storageObject.count({
        where: { contextArtifactId, purgeRequestedAt: null },
      }),
      transaction.storageObject.aggregate({
        where: { contextArtifactId, purgeRequestedAt: null, selected: true },
        _count: true,
        _sum: { sizeBytes: true },
      }),
    ]);

    if (totalFiles >= MAX_TOTAL_FILES) {
      throw new PayloadTooLargeException(
        `A Context can retain at most ${MAX_TOTAL_FILES} files`,
      );
    }

    const selectedCount = selected._count;
    const selectedBytes = Number(selected._sum.sizeBytes ?? 0n);

    if (
      selectedCount >= MAX_SELECTED_FILES ||
      selectedBytes + newFileBytes > MAX_SELECTED_BYTES
    ) {
      throw new PayloadTooLargeException(
        'Selected Context files would exceed the active limit',
      );
    }
  }

  private async assertSelectedLimits(
    transaction: Prisma.TransactionClient,
    contextArtifactId: string,
    newFileBytes: number,
  ): Promise<void> {
    const selected = await transaction.storageObject.aggregate({
      where: {
        contextArtifactId,
        purgeRequestedAt: null,
        selected: true,
      },
      _count: true,
      _sum: { sizeBytes: true },
    });

    if (
      selected._count >= MAX_SELECTED_FILES ||
      Number(selected._sum.sizeBytes ?? 0n) + newFileBytes > MAX_SELECTED_BYTES
    ) {
      throw new PayloadTooLargeException(
        'Selected Context files would exceed the active limit',
      );
    }
  }

  private async lockContextArtifact(
    transaction: Prisma.TransactionClient,
    contextArtifactId: string,
  ): Promise<void> {
    await transaction.$queryRaw(
      Prisma.sql`SELECT 1 FROM "context_artifact" WHERE "context_artifact_id" = ${contextArtifactId}::uuid FOR UPDATE`,
    );
  }

  private async purgeStorageObjectBytes(storageObject: {
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

    await this.prismaService.storageObject.delete({
      where: { id: storageObject.id },
    });
  }

  private toContextResponse(
    contextArtifact: {
      readonly publicNumber: number;
      readonly content: string;
      readonly createdAt: Date;
      readonly updatedAt: Date;
    },
    featurePublicNumber: number,
  ) {
    return this.prismaService.storageObject
      .findMany({
        where: {
          contextArtifact: { publicNumber: contextArtifact.publicNumber },
          purgeRequestedAt: null,
          OR: [{ selected: true }, { status: StorageObjectStatus.failed }],
        },
        orderBy: { createdAt: 'desc' },
      })
      .then((files) => ({
        publicKey: formatPublicKey(
          'contextArtifact',
          contextArtifact.publicNumber,
        ),
        featureKey: formatPublicKey('feature', featurePublicNumber),
        content: contextArtifact.content,
        files: files.map((file) => this.toStorageObjectResponse(file)),
        createdAt: contextArtifact.createdAt,
        updatedAt: contextArtifact.updatedAt,
      }));
  }

  private toStorageObjectResponse(storageObject: {
    readonly publicNumber: number;
    readonly status: StorageObjectStatus;
    readonly selected: boolean;
    readonly assetType: AssetType;
    readonly mimeType: string;
    readonly sizeBytes: bigint;
    readonly originalFilename: string;
    readonly failureCode: string | null;
    readonly failureMessage: string | null;
    readonly firstUsedAt: Date | null;
    readonly createdAt: Date;
    readonly readyAt: Date | null;
    readonly updatedAt: Date;
  }): StorageObjectResponse {
    return {
      publicKey: formatPublicKey('storageObject', storageObject.publicNumber),
      status: storageObject.status,
      selected: storageObject.selected,
      assetType: storageObject.assetType,
      mimeType: storageObject.mimeType,
      sizeBytes: Number(storageObject.sizeBytes),
      filename: storageObject.originalFilename,
      failure:
        storageObject.failureCode === null
          ? null
          : {
              code: storageObject.failureCode,
              message: storageObject.failureMessage,
            },
      canDeletePermanently:
        storageObject.firstUsedAt === null &&
        (storageObject.status !== StorageObjectStatus.ready ||
          !storageObject.selected),
      createdAt: storageObject.createdAt,
      readyAt: storageObject.readyAt,
      updatedAt: storageObject.updatedAt,
    };
  }
}
