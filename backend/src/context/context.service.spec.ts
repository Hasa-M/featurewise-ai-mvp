import { ConflictException, NotFoundException } from '@nestjs/common';
import { AssetType, StorageObjectStatus, type Prisma } from '@prisma/client';

import type { CurrentUserContext } from '../auth/current-user-context';
import type { PrismaService } from '../database/prisma.service';
import type { FeaturesService } from '../features/features.service';
import type { StorageService } from '../storage/storage.service';
import type { ContextFileProcessorService } from './context-file-processor.service';
import { ContextService } from './context.service';

const currentUser: CurrentUserContext = {
  organizationId: '00000000-0000-4000-8000-000000000001',
  organizationKey: 'ORG-12',
  projectId: '00000000-0000-4000-8000-000000000002',
  projectKey: 'PRJ-204',
  userId: '00000000-0000-4000-8000-000000000003',
  userKey: 'USR-7',
  username: 'dev.operator',
};

const featureRecord = {
  id: '00000000-0000-4000-8000-000000000004',
  publicNumber: 5831,
  project: { publicNumber: 204 },
};
const contextArtifact = {
  id: '00000000-0000-4000-8000-000000000005',
  publicNumber: 19,
  featureId: featureRecord.id,
  content: 'Current context',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const readyFile = {
  id: '00000000-0000-4000-8000-000000000006',
  publicNumber: 42,
  contextArtifactId: contextArtifact.id,
  status: StorageObjectStatus.ready,
  selected: true,
  assetType: AssetType.file,
  mimeType: 'application/pdf',
  sizeBytes: 1024n,
  originalFilename: 'design.pdf',
  failureCode: null,
  failureMessage: null,
  firstUsedAt: null,
  purgeRequestedAt: null,
  s3VersionId: 'version-1',
  s3Key: 'original',
  uploadKey: 'staging',
  uploadVersionId: 'version-0',
  preparedS3Key: null,
  preparedS3VersionId: null,
  createdAt: new Date(),
  readyAt: new Date(),
  updatedAt: new Date(),
};

function createService(options?: {
  readonly context?: typeof contextArtifact | null;
  readonly files?: readonly (typeof readyFile)[];
}) {
  const getFeatureRecord = jest.fn().mockResolvedValue(featureRecord);
  const findUnique = jest
    .fn()
    .mockResolvedValue(
      options?.context === undefined ? contextArtifact : options.context,
    );
  const update = jest
    .fn()
    .mockImplementation(({ data }) =>
      Promise.resolve({ ...contextArtifact, ...data, updatedAt: new Date() }),
    );
  const findMany = jest.fn().mockResolvedValue(options?.files ?? []);
  const updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const storageFindUnique = jest.fn().mockResolvedValue(readyFile);
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
    contextArtifact: { findUnique, update },
    storageObject: {
      findMany,
      findUnique: storageFindUnique,
      updateMany,
    },
  };
  Object.assign(prisma, {
    $transaction: jest.fn(
      <T>(callback: (transaction: typeof prisma) => Promise<T>) =>
        callback(prisma),
    ),
  });
  const service = new ContextService(
    { getFeatureRecord } as unknown as FeaturesService,
    prisma as unknown as PrismaService,
    {} as StorageService,
    {} as ContextFileProcessorService,
  );

  return {
    findMany,
    findUnique,
    getFeatureRecord,
    service,
    storageFindUnique,
    update,
    updateMany,
  };
}

describe('ContextService', () => {
  it('keeps supporting text and selected Files separate in the public response', async () => {
    const { service } = createService({ files: [readyFile] });

    await expect(
      service.getFeatureContext(currentUser, 5831),
    ).resolves.toMatchObject({
      publicKey: 'CTX-19',
      featureKey: 'FEAT-5831',
      content: 'Current context',
      files: [
        {
          publicKey: 'OBJ-42',
          filename: 'design.pdf',
          selected: true,
          sizeBytes: 1024,
        },
      ],
    });
  });

  it('updates only ContextArtifact content', async () => {
    const { service, update } = createService();

    await service.updateFeatureContext(currentUser, 5831, {
      content: 'Updated context',
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: contextArtifact.id },
      data: { content: 'Updated context' },
    });
  });

  it('returns 404 when the ContextArtifact invariant is broken', async () => {
    const { service } = createService({ context: null });

    await expect(
      service.getFeatureContext(currentUser, 5831),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not permanently delete a ready selected file', async () => {
    const { service } = createService({ files: [readyFile] });
    const prismaService = (
      service as unknown as { prismaService: { storageObject: object } }
    ).prismaService;
    Object.assign(prismaService.storageObject, {
      findFirst: jest.fn().mockResolvedValue(readyFile),
    });

    await expect(
      service.purgeStorageObject(currentUser, 42),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('captures exact immutable file versions and records first use once', async () => {
    const { service } = createService();
    const updateMany = jest
      .fn<
        Promise<{ count: number }>,
        [
          {
            readonly data: { readonly firstUsedAt: Date };
            readonly where: Record<string, unknown>;
          },
        ]
      >()
      .mockResolvedValue({ count: 1 });
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
      contextArtifact: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: contextArtifact.id })
          .mockResolvedValueOnce({
            ...contextArtifact,
            storageObjects: [
              {
                ...readyFile,
                checksumSha256: 'checksum-original',
                preparationVersion: 'original',
                preparedChecksumSha256: null,
                preparedMimeType: null,
                preparedSizeBytes: null,
              },
            ],
          }),
      },
      storageObject: { updateMany },
    } as unknown as Prisma.TransactionClient;
    const capturedAt = new Date('2026-08-29T12:00:00.000Z');

    await expect(
      service.captureAnalysisContextInput(
        transaction,
        featureRecord.id,
        capturedAt,
      ),
    ).resolves.toEqual({
      publicNumber: 19,
      content: 'Current context',
      files: [
        {
          assetType: AssetType.file,
          filename: 'design.pdf',
          original: {
            checksumSha256: 'checksum-original',
            mimeType: 'application/pdf',
            s3Key: 'original',
            s3VersionId: 'version-1',
            sizeBytes: 1024,
          },
          preparationVersion: 'original',
          prepared: null,
          publicNumber: 42,
        },
      ],
    });
    const updateManyArgument = updateMany.mock.calls[0]?.[0];
    expect(updateManyArgument).toMatchObject({
      where: {
        id: { in: [readyFile.id] },
        firstUsedAt: null,
        purgeRequestedAt: null,
        selected: true,
        status: StorageObjectStatus.ready,
      },
    });
    expect(updateManyArgument?.data?.firstUsedAt).toBe(capturedAt);
  });

  it('preserves an existing firstUsedAt timestamp during capture', async () => {
    const { service } = createService();
    const existingFirstUse = new Date('2026-08-28T10:00:00.000Z');
    const updateMany = jest.fn();
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
      contextArtifact: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: contextArtifact.id })
          .mockResolvedValueOnce({
            ...contextArtifact,
            storageObjects: [
              {
                ...readyFile,
                firstUsedAt: existingFirstUse,
                checksumSha256: 'checksum-original',
                preparationVersion: 'original',
                preparedChecksumSha256: null,
                preparedMimeType: null,
                preparedSizeBytes: null,
              },
            ],
          }),
      },
      storageObject: { updateMany },
    } as unknown as Prisma.TransactionClient;

    await service.captureAnalysisContextInput(
      transaction,
      featureRecord.id,
      new Date(),
    );

    expect(updateMany).not.toHaveBeenCalled();
  });

  it('filters capture to selected ready non-purging files in public-number order', async () => {
    const { service } = createService();
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: contextArtifact.id })
      .mockResolvedValueOnce({
        ...contextArtifact,
        storageObjects: [],
      });
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
      contextArtifact: { findUnique },
      storageObject: { updateMany: jest.fn() },
    } as unknown as Prisma.TransactionClient;

    await service.captureAnalysisContextInput(
      transaction,
      featureRecord.id,
      new Date(),
    );

    expect(findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: contextArtifact.id },
      include: {
        storageObjects: {
          where: {
            purgeRequestedAt: null,
            selected: true,
            status: StorageObjectStatus.ready,
          },
          orderBy: { publicNumber: 'asc' },
        },
      },
    });
  });
});
