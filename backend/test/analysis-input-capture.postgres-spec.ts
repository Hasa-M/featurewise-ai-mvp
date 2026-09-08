import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { AssetType, PrismaClient, StorageObjectStatus } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

import { AnalysisInputCaptureService } from '../src/analysis/analysis-input-capture.service';
import { ANALYSIS_SETTINGS_VERSION } from '../src/analysis/contracts/analysis-contracts';
import type { CurrentUserContext } from '../src/auth/current-user-context';
import { formatPublicKey } from '../src/common/public-identifiers';
import { buildDatabaseUrl } from '../src/config/database-url';
import { ContextService } from '../src/context/context.service';
import type { ContextFileProcessorService } from '../src/context/context-file-processor.service';
import type { PrismaService } from '../src/database/prisma.service';
import { FeaturesService } from '../src/features/features.service';
import type { RepositoryContextService } from '../src/repository-context';
import type { StorageService } from '../src/storage/storage.service';
import { WorkspaceService } from '../src/workspace/workspace.service';

if (!process.env.HARNESS_MODE) loadEnv({ quiet: true });

jest.setTimeout(60_000);

const settings = {
  contractVersion: ANALYSIS_SETTINGS_VERSION,
  parameters: {},
} as const;

interface WorkspaceFixture {
  readonly currentUser: CurrentUserContext;
  readonly featureId: string;
  readonly featureKey: string;
  readonly projectKey: string;
  readonly contextArtifactId: string;
  readonly userId: string;
}

describe('Analysis input capture PostgreSQL invariants', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg(buildDatabaseUrl(), { schema: 'public' }),
  });
  const prismaService = prisma as unknown as PrismaService;
  const workspaceService = new WorkspaceService(prismaService);
  const featuresService = new FeaturesService(prismaService, workspaceService);
  const contextService = new ContextService(
    featuresService,
    prismaService,
    {} as StorageService,
    {} as ContextFileProcessorService,
  );
  const prepareFeatureRepositoryRevision = jest.fn();
  const assertFeatureRepositoryRevisionConsistency = jest.fn();
  const repositoryContextService = {
    prepareFeatureRepositoryRevision,
    assertFeatureRepositoryRevisionConsistency,
  } as unknown as RepositoryContextService;
  const captureService = new AnalysisInputCaptureService(
    contextService,
    featuresService,
    prismaService,
    repositoryContextService,
    workspaceService,
  );

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('captures reproducible inputs and preserves first use under concurrency', async () => {
    const fixture = await createWorkspace({
      featureContext: 'Feature context before capture',
      projectContext: 'Project context before capture',
      specificationContent: 'Specification before capture',
    });
    const token = randomUUID().replaceAll('-', '');
    const selectedOriginal = await createStorageObject(fixture, {
      token: `${token}-selected-original`,
      status: StorageObjectStatus.ready,
      selected: true,
      preparationVersion: 'original',
    });
    const selectedPrepared = await createStorageObject(fixture, {
      token: `${token}-selected-prepared`,
      status: StorageObjectStatus.ready,
      selected: true,
      preparationVersion: 'document-pdf-v1',
      prepared: true,
    });
    const excluded = await Promise.all([
      createStorageObject(fixture, {
        token: `${token}-unselected`,
        status: StorageObjectStatus.ready,
        selected: false,
        preparationVersion: 'original',
      }),
      createStorageObject(fixture, {
        token: `${token}-pending`,
        status: StorageObjectStatus.pending_upload,
        selected: true,
      }),
      createStorageObject(fixture, {
        token: `${token}-processing`,
        status: StorageObjectStatus.processing,
        selected: true,
      }),
      createStorageObject(fixture, {
        token: `${token}-failed`,
        status: StorageObjectStatus.failed,
        selected: false,
      }),
      createStorageObject(fixture, {
        token: `${token}-purging`,
        status: StorageObjectStatus.ready,
        selected: false,
        preparationVersion: 'original',
        purgeRequestedAt: new Date(),
      }),
    ]);

    const snapshot = await captureService.captureInputSnapshot(
      fixture.currentUser,
      {
        projectKey: fixture.projectKey,
        featureKey: fixture.featureKey,
        analysisSettings: settings,
      },
    );

    expect(snapshot).toMatchObject({
      feature: {
        title: 'Feature',
        specificationContent: 'Specification before capture',
      },
      featureContext: { content: 'Feature context before capture' },
      projectContext: { content: 'Project context before capture' },
      files: [
        {
          publicKey: formatPublicKey(
            'storageObject',
            selectedOriginal.publicNumber,
          ),
          preparationVersion: 'original',
          original: {
            s3Key: selectedOriginal.s3Key,
            s3VersionId: selectedOriginal.s3VersionId,
            checksumSha256: selectedOriginal.checksumSha256,
            mimeType: selectedOriginal.mimeType,
            sizeBytes: Number(selectedOriginal.sizeBytes),
          },
          prepared: null,
        },
        {
          publicKey: formatPublicKey(
            'storageObject',
            selectedPrepared.publicNumber,
          ),
          preparationVersion: 'document-pdf-v1',
          prepared: {
            s3Key: selectedPrepared.preparedS3Key,
            s3VersionId: selectedPrepared.preparedS3VersionId,
            checksumSha256: selectedPrepared.preparedChecksumSha256,
            mimeType: selectedPrepared.preparedMimeType,
            sizeBytes: Number(selectedPrepared.preparedSizeBytes),
          },
        },
      ],
    });
    expect(JSON.stringify(snapshot)).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}/i,
    );

    const capturedRows = await prisma.storageObject.findMany({
      where: {
        id: { in: [selectedOriginal.id, selectedPrepared.id] },
      },
      orderBy: { publicNumber: 'asc' },
    });
    expect(capturedRows.map((row) => row.firstUsedAt?.toISOString())).toEqual([
      snapshot.capturedAt,
      snapshot.capturedAt,
    ]);
    const excludedRows = await prisma.storageObject.findMany({
      where: { id: { in: excluded.map((file) => file.id) } },
    });
    expect(excludedRows.every((row) => row.firstUsedAt === null)).toBe(true);

    await Promise.all([
      prisma.feature.update({
        where: { id: fixture.featureId },
        data: { specificationContent: 'Specification after capture' },
      }),
      prisma.contextArtifact.update({
        where: { id: fixture.contextArtifactId },
        data: { content: 'Feature context after capture' },
      }),
      prisma.projectContext.update({
        where: { projectId: fixture.currentUser.projectId },
        data: { content: 'Project context after capture' },
      }),
      prisma.storageObject.update({
        where: { id: selectedOriginal.id },
        data: { selected: false, unselectedAt: new Date() },
      }),
    ]);
    expect(snapshot.feature.specificationContent).toBe(
      'Specification before capture',
    );
    expect(snapshot.featureContext.content).toBe(
      'Feature context before capture',
    );
    expect(snapshot.projectContext?.content).toBe(
      'Project context before capture',
    );
    expect(snapshot.files).toHaveLength(2);

    const firstUsedAt = capturedRows[0].firstUsedAt;
    await captureService.captureInputSnapshot(fixture.currentUser, {
      projectKey: fixture.projectKey,
      featureKey: fixture.featureKey,
      analysisSettings: settings,
    });
    expect(
      (
        await prisma.storageObject.findUniqueOrThrow({
          where: { id: selectedOriginal.id },
        })
      ).firstUsedAt,
    ).toEqual(firstUsedAt);

    const concurrentFixture = await createFeature(fixture, {
      specificationContent: '',
      context: '',
    });
    const concurrentFile = await createStorageObject(concurrentFixture, {
      token: `${token}-concurrent`,
      status: StorageObjectStatus.ready,
      selected: true,
      preparationVersion: 'original',
    });
    const concurrentSnapshots = await Promise.all([
      captureService.captureInputSnapshot(concurrentFixture.currentUser, {
        projectKey: concurrentFixture.projectKey,
        featureKey: concurrentFixture.featureKey,
        analysisSettings: settings,
      }),
      captureService.captureInputSnapshot(concurrentFixture.currentUser, {
        projectKey: concurrentFixture.projectKey,
        featureKey: concurrentFixture.featureKey,
        analysisSettings: settings,
      }),
    ]);
    const concurrentFirstUsedAt = (
      await prisma.storageObject.findUniqueOrThrow({
        where: { id: concurrentFile.id },
      })
    ).firstUsedAt?.toISOString();
    expect(concurrentSnapshots.map((item) => item.files)).toEqual([
      concurrentSnapshots[0].files,
      concurrentSnapshots[0].files,
    ]);
    expect(
      concurrentSnapshots.some(
        (item) => item.capturedAt === concurrentFirstUsedAt,
      ),
    ).toBe(true);
    expect(await prisma.analysisRun.count()).toBe(0);
  });

  it('treats missing ProjectContext as null and rejects cross-organization targets', async () => {
    const withoutProjectContext = await createWorkspace({
      featureContext: '',
      projectContext: null,
      specificationContent: '',
    });
    const snapshot = await captureService.captureInputSnapshot(
      withoutProjectContext.currentUser,
      {
        projectKey: withoutProjectContext.projectKey,
        featureKey: withoutProjectContext.featureKey,
        analysisSettings: settings,
      },
    );

    expect(snapshot).toMatchObject({
      feature: { specificationContent: '' },
      featureContext: { content: '' },
      projectContext: null,
      files: [],
    });
    expect(
      await prisma.projectContext.findUnique({
        where: { projectId: withoutProjectContext.currentUser.projectId },
      }),
    ).toBeNull();

    const other = await createWorkspace({
      featureContext: 'Other context',
      projectContext: 'Other project context',
      specificationContent: 'Other specification',
    });

    await expect(
      captureService.captureInputSnapshot(withoutProjectContext.currentUser, {
        projectKey: other.projectKey,
        featureKey: other.featureKey,
        analysisSettings: settings,
      }),
    ).rejects.toThrow('Project not found');
    await expect(
      captureService.captureInputSnapshot(withoutProjectContext.currentUser, {
        projectKey: withoutProjectContext.projectKey,
        featureKey: other.featureKey,
        analysisSettings: settings,
      }),
    ).rejects.toThrow('Feature not found');
  });

  it('rolls back firstUsedAt for every failed v2 finalization and commits it only on success', async () => {
    const fixture = await createWorkspace({
      featureContext: 'Atomic v2 context',
      projectContext: null,
      specificationContent: 'Atomic v2 specification',
    });
    const file = await createStorageObject(fixture, {
      token: `${randomUUID()}-atomic-v2`,
      status: StorageObjectStatus.ready,
      selected: true,
      preparationVersion: 'original',
    });
    const token = {
      featureId: fixture.featureId,
      projectId: fixture.currentUser.projectId,
      connectionId: null,
      configurationVersion: null,
      contextUpdatedAt: null,
      branchOverride: null,
      selectedPaths: [],
    };
    const command = {
      projectKey: fixture.projectKey,
      featureKey: fixture.featureKey,
      analysisSettings: settings,
    };

    prepareFeatureRepositoryRevision.mockRejectedValueOnce(
      new Error('GitHub unavailable'),
    );
    await expect(
      captureService.captureInputSnapshotV2(fixture.currentUser, command),
    ).rejects.toThrow('GitHub unavailable');
    expect(
      (await prisma.storageObject.findUniqueOrThrow({ where: { id: file.id } }))
        .firstUsedAt,
    ).toBeNull();

    prepareFeatureRepositoryRevision.mockResolvedValueOnce({
      revision: null,
      consistencyToken: token,
    });
    assertFeatureRepositoryRevisionConsistency.mockRejectedValueOnce(
      new Error('Concurrent repository configuration change'),
    );
    await expect(
      captureService.captureInputSnapshotV2(fixture.currentUser, command),
    ).rejects.toThrow('Concurrent repository configuration change');
    expect(
      (await prisma.storageObject.findUniqueOrThrow({ where: { id: file.id } }))
        .firstUsedAt,
    ).toBeNull();

    prepareFeatureRepositoryRevision.mockResolvedValueOnce({
      revision: {
        publicKey: 'REPO-1',
        fullName: 'featurewise/private',
        branch: 'main',
        commitSha: 'invalid',
        capturedAt: new Date().toISOString(),
        manifest: { paths: [], truncated: false },
        files: [],
      },
      consistencyToken: token,
    });
    assertFeatureRepositoryRevisionConsistency.mockResolvedValueOnce(undefined);
    await expect(
      captureService.captureInputSnapshotV2(fixture.currentUser, command),
    ).rejects.toThrow('Repository commit SHA is invalid');
    expect(
      (await prisma.storageObject.findUniqueOrThrow({ where: { id: file.id } }))
        .firstUsedAt,
    ).toBeNull();

    prepareFeatureRepositoryRevision.mockResolvedValueOnce({
      revision: null,
      consistencyToken: token,
    });
    assertFeatureRepositoryRevisionConsistency.mockResolvedValueOnce(undefined);
    await expect(
      captureService.captureInputSnapshotV2(fixture.currentUser, command),
    ).resolves.toMatchObject({
      contractVersion: 'analysis-input-snapshot-v2',
      repository: null,
    });
    expect(
      (await prisma.storageObject.findUniqueOrThrow({ where: { id: file.id } }))
        .firstUsedAt,
    ).not.toBeNull();
  });

  async function createWorkspace(input: {
    readonly featureContext: string;
    readonly projectContext: string | null;
    readonly specificationContent: string;
  }): Promise<WorkspaceFixture> {
    const suffix = randomUUID();
    const organization = await prisma.organization.create({
      data: { name: `Organization ${suffix}` },
    });
    const project = await prisma.project.create({
      data: {
        name: `Project ${suffix}`,
        organizationId: organization.id,
        ...(input.projectContext === null
          ? {}
          : { context: { create: { content: input.projectContext } } }),
      },
    });
    const user = await prisma.user.create({
      data: {
        organizationId: organization.id,
        username: `analysis-input-${suffix}`,
        passwordHash: 'unused-in-integration-test',
      },
    });
    const base: WorkspaceFixture = {
      currentUser: {
        organizationId: organization.id,
        organizationKey: formatPublicKey(
          'organization',
          organization.publicNumber,
        ),
        projectId: project.id,
        projectKey: formatPublicKey('project', project.publicNumber),
        userId: user.id,
        userKey: formatPublicKey('user', user.publicNumber),
        username: user.username,
      },
      featureId: '',
      featureKey: '',
      projectKey: formatPublicKey('project', project.publicNumber),
      contextArtifactId: '',
      userId: user.id,
    };

    return createFeature(base, {
      specificationContent: input.specificationContent,
      context: input.featureContext,
    });
  }

  async function createFeature(
    fixture: WorkspaceFixture,
    input: { readonly specificationContent: string; readonly context: string },
  ): Promise<WorkspaceFixture> {
    const feature = await prisma.feature.create({
      data: {
        projectId: fixture.currentUser.projectId,
        createdById: fixture.userId,
        title: 'Feature',
        specificationContent: input.specificationContent,
        contextArtifact: { create: { content: input.context } },
      },
      include: { contextArtifact: true },
    });

    if (feature.contextArtifact === null) {
      throw new Error('ContextArtifact was not created');
    }

    return {
      ...fixture,
      featureId: feature.id,
      featureKey: formatPublicKey('feature', feature.publicNumber),
      contextArtifactId: feature.contextArtifact.id,
    };
  }

  async function createStorageObject(
    fixture: WorkspaceFixture,
    input: {
      readonly token: string;
      readonly status: StorageObjectStatus;
      readonly selected: boolean;
      readonly preparationVersion?: string;
      readonly prepared?: boolean;
      readonly purgeRequestedAt?: Date;
    },
  ) {
    const ready = input.status === StorageObjectStatus.ready;
    const failed = input.status === StorageObjectStatus.failed;

    return prisma.storageObject.create({
      data: {
        contextArtifactId: fixture.contextArtifactId,
        createdById: fixture.userId,
        status: input.status,
        selected: input.selected,
        uploadKey: `analysis-input/${input.token}/upload`,
        s3Key: `analysis-input/${input.token}/original`,
        s3VersionId: ready ? `original-version-${input.token}` : null,
        assetType: AssetType.file,
        mimeType: 'application/pdf',
        sizeBytes: 2048n,
        originalFilename: `${input.token}.pdf`,
        checksumSha256: `original-checksum-${input.token}`,
        preparedS3Key: input.prepared
          ? `analysis-input/${input.token}/prepared`
          : null,
        preparedS3VersionId: input.prepared
          ? `prepared-version-${input.token}`
          : null,
        preparedMimeType: input.prepared ? 'application/pdf' : null,
        preparedSizeBytes: input.prepared ? 1024n : null,
        preparedChecksumSha256: input.prepared
          ? `prepared-checksum-${input.token}`
          : null,
        preparationVersion: input.preparationVersion,
        failureCode: failed ? 'TEST_FAILURE' : null,
        failureMessage: failed ? 'Expected failed fixture' : null,
        uploadExpiresAt: new Date(Date.now() + 60_000),
        readyAt: ready ? new Date() : null,
        failedAt: failed ? new Date() : null,
        unselectedAt: input.selected ? null : new Date(),
        purgeRequestedAt: input.purgeRequestedAt,
      },
    });
  }
});
