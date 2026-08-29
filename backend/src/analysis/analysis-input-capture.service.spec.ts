import { NotFoundException } from '@nestjs/common';

import type { CurrentUserContext } from '../auth/current-user-context';
import type { ContextService } from '../context/context.service';
import type { PrismaService } from '../database/prisma.service';
import type { FeaturesService } from '../features/features.service';
import type { WorkspaceService } from '../workspace/workspace.service';
import { AnalysisInputCaptureService } from './analysis-input-capture.service';
import { ANALYSIS_SETTINGS_VERSION } from './contracts/analysis-contracts';

const currentUser: CurrentUserContext = {
  organizationId: '00000000-0000-4000-8000-000000000001',
  organizationKey: 'ORG-12',
  projectId: '00000000-0000-4000-8000-000000000002',
  projectKey: 'PRJ-204',
  userId: '00000000-0000-4000-8000-000000000003',
  userKey: 'USR-7',
  username: 'dev.operator',
};

const settings = {
  contractVersion: ANALYSIS_SETTINGS_VERSION,
  parameters: { mode: 'default' },
} as const;

function createService(options?: { readonly projectContextMissing?: boolean }) {
  const transaction = {};
  const getAnalysisProjectInput = jest.fn().mockResolvedValue({
    id: currentUser.projectId,
    publicNumber: 204,
    context: options?.projectContextMissing
      ? null
      : { publicNumber: 31, content: 'Shared project context' },
  });
  const getAnalysisFeatureInput = jest.fn().mockResolvedValue({
    id: '00000000-0000-4000-8000-000000000004',
    publicNumber: 5831,
    title: 'Checkout',
    specificationContent: 'Feature specification',
  });
  const captureAnalysisContextInput = jest.fn().mockResolvedValue({
    publicNumber: 19,
    content: 'Feature context',
    files: [
      {
        publicNumber: 42,
        assetType: 'file',
        filename: 'design.docx',
        preparationVersion: 'document-pdf-v1',
        original: {
          s3Key: 'original-key',
          s3VersionId: 'original-version',
          checksumSha256: 'original-checksum',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          sizeBytes: 2048,
        },
        prepared: {
          s3Key: 'prepared-key',
          s3VersionId: 'prepared-version',
          checksumSha256: 'prepared-checksum',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        },
      },
    ],
  });
  const prisma = {
    $transaction: jest.fn(<T>(callback: (client: object) => Promise<T>) =>
      callback(transaction),
    ),
  };
  const service = new AnalysisInputCaptureService(
    { captureAnalysisContextInput } as unknown as ContextService,
    { getAnalysisFeatureInput } as unknown as FeaturesService,
    prisma as unknown as PrismaService,
    { getAnalysisProjectInput } as unknown as WorkspaceService,
  );

  return {
    captureAnalysisContextInput,
    getAnalysisFeatureInput,
    getAnalysisProjectInput,
    service,
    transaction,
  };
}

describe('AnalysisInputCaptureService', () => {
  it('captures the exact versioned public-key-only snapshot shape', async () => {
    const { service } = createService();

    const snapshot = await service.captureInputSnapshot(currentUser, {
      projectKey: 'PRJ-204',
      featureKey: 'FEAT-5831',
      analysisSettings: settings,
    });

    expect(snapshot).toMatchObject({
      contractVersion: 'analysis-input-snapshot-v1',
      feature: {
        publicKey: 'FEAT-5831',
        projectKey: 'PRJ-204',
        specificationSourceId: 'feature_specification:FEAT-5831',
        title: 'Checkout',
        specificationContent: 'Feature specification',
      },
      featureContext: {
        publicKey: 'CTX-19',
        sourceId: 'feature_context:CTX-19',
        content: 'Feature context',
      },
      projectContext: {
        publicKey: 'PCTX-31',
        sourceId: 'project_context:PCTX-31',
        content: 'Shared project context',
      },
      files: [
        {
          publicKey: 'OBJ-42',
          sourceId: 'uploaded_file:OBJ-42',
          preparationVersion: 'document-pdf-v1',
          original: {
            s3Key: 'original-key',
            s3VersionId: 'original-version',
            checksumSha256: 'original-checksum',
            sizeBytes: 2048,
          },
          prepared: {
            s3Key: 'prepared-key',
            s3VersionId: 'prepared-version',
            checksumSha256: 'prepared-checksum',
            mimeType: 'application/pdf',
            sizeBytes: 1024,
          },
        },
      ],
      analysisSettings: settings,
    });
    expect(snapshot.capturedAt).toEqual(expect.any(String));
    expect(JSON.stringify(snapshot)).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}/i,
    );
  });

  it('captures a missing ProjectContext deterministically as null', async () => {
    const { service } = createService({ projectContextMissing: true });

    await expect(
      service.captureInputSnapshot(currentUser, {
        projectKey: 'PRJ-204',
        featureKey: 'FEAT-5831',
        analysisSettings: settings,
      }),
    ).resolves.toMatchObject({ projectContext: null });
  });

  it('uses the authorized Project and Feature public boundaries in one transaction', async () => {
    const {
      captureAnalysisContextInput,
      getAnalysisFeatureInput,
      getAnalysisProjectInput,
      service,
      transaction,
    } = createService();

    await service.captureInputSnapshot(currentUser, {
      projectKey: 'PRJ-204',
      featureKey: 'FEAT-5831',
      analysisSettings: settings,
    });

    expect(getAnalysisProjectInput).toHaveBeenCalledWith(
      transaction,
      currentUser,
      204,
    );
    expect(getAnalysisFeatureInput).toHaveBeenCalledWith(
      transaction,
      currentUser,
      currentUser.projectId,
      5831,
    );
    expect(captureAnalysisContextInput).toHaveBeenCalledWith(
      transaction,
      '00000000-0000-4000-8000-000000000004',
      expect.any(Date),
    );
  });

  it('does not continue when Project authorization fails', async () => {
    const { getAnalysisFeatureInput, getAnalysisProjectInput, service } =
      createService();
    getAnalysisProjectInput.mockRejectedValue(
      new NotFoundException('Project not found'),
    );

    await expect(
      service.captureInputSnapshot(currentUser, {
        projectKey: 'PRJ-204',
        featureKey: 'FEAT-5831',
        analysisSettings: settings,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(getAnalysisFeatureInput).not.toHaveBeenCalled();
  });
});
