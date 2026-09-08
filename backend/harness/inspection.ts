import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/database/prisma.service';
import { AnalysisInputCaptureService } from '../src/analysis/analysis-input-capture.service';
import {
  ANALYSIS_SETTINGS_VERSION,
  type AnalysisInputSnapshotV2,
} from '../src/analysis/contracts/analysis-contracts';
import {
  formatPublicKey,
  parsePublicKey,
} from '../src/common/public-identifiers';
import { StorageService } from '../src/storage/storage.service';
import { artifacts, type HarnessSettings } from './environment';

export const json = (value: unknown) =>
  JSON.stringify(
    value,
    (_key, item: unknown) =>
      typeof item === 'bigint' ? item.toString() : item,
    2,
  ) + '\n';
export const saveJson = (path: string, value: unknown) =>
  writeFileSync(path, json(value), { flag: 'wx' });
export function artifactDirectory(label: string) {
  const directory = join(
    artifacts,
    `${label}-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`,
  );
  mkdirSync(directory, { recursive: true });
  return directory;
}
export async function actor(app: INestApplication, settings: HarnessSettings) {
  const auth = app.get(AuthService);
  const login = await auth.login({
    username: 'harness.operator',
    password: settings.operatorPassword,
  });
  return auth.authenticateToken(login.accessToken);
}
export async function inspectFeature(
  app: INestApplication,
  settings: HarnessSettings,
  featureKey: string,
) {
  const user = await actor(app, settings);
  const feature = await app.get(PrismaService).feature.findFirstOrThrow({
    where: {
      publicNumber: parsePublicKey('feature', featureKey),
      project: { organizationId: user.organizationId },
      deletedAt: null,
    },
    include: {
      project: { include: { context: true } },
      contextArtifact: { include: { storageObjects: true } },
      repositoryContext: { include: { selectedFiles: true, connection: true } },
    },
  });
  return {
    observedAt: new Date().toISOString(),
    featureKey,
    title: feature.title,
    specificationContent: feature.specificationContent,
    projectKey: formatPublicKey('project', feature.project.publicNumber),
    projectContext: feature.project.context?.content ?? null,
    featureContext: feature.contextArtifact?.content ?? null,
    files: (feature.contextArtifact?.storageObjects ?? []).map((file) => ({
      publicKey: formatPublicKey('storageObject', file.publicNumber),
      filename: file.originalFilename,
      status: file.status,
      selected: file.selected,
      firstUsedAt: file.firstUsedAt,
      purgeRequestedAt: file.purgeRequestedAt,
      eligibility: file.purgeRequestedAt
        ? 'purge_requested'
        : !file.selected
          ? 'unselected'
          : file.status !== 'ready'
            ? `not_ready:${file.status}`
            : 'selected_ready',
      original: {
        s3Key: file.s3Key,
        s3VersionId: file.s3VersionId,
        checksumSha256: file.checksumSha256,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
      },
      prepared: file.preparedS3Key
        ? {
            s3Key: file.preparedS3Key,
            s3VersionId: file.preparedS3VersionId,
            checksumSha256: file.preparedChecksumSha256,
            mimeType: file.preparedMimeType,
            sizeBytes: Number(file.preparedSizeBytes),
          }
        : null,
      preparationVersion: file.preparationVersion,
    })),
    repository: feature.repositoryContext
      ? {
          publicKey: formatPublicKey(
            'projectRepositoryConnection',
            feature.repositoryContext.connection.publicNumber,
          ),
          fullName: feature.repositoryContext.connection.fullName,
          branchOverride: feature.repositoryContext.branchOverride,
          baseBranch: feature.repositoryContext.connection.baseBranch,
          selectedPaths: feature.repositoryContext.selectedFiles.map(
            (file) => file.path,
          ),
        }
      : null,
  };
}

export async function exportCapture(
  app: INestApplication,
  settings: HarnessSettings,
  projectKey: string,
  featureKey: string,
  attachments: boolean,
) {
  const directory = artifactDirectory('capture');
  saveJson(join(directory, 'execution.json'), {
    projectKey,
    featureKey,
    providerMode: process.env.HARNESS_MODE,
    sideEffect: 'Capture may set firstUsedAt; no AnalysisRun is created',
    preparedContext: 'not generated',
    providerRequest: 'not rendered',
  });
  try {
    const snapshot = await app
      .get(AnalysisInputCaptureService)
      .captureInputSnapshotV2(await actor(app, settings), {
        projectKey,
        featureKey,
        analysisSettings: {
          contractVersion: ANALYSIS_SETTINGS_VERSION,
          parameters: {},
        },
      });
    saveJson(join(directory, 'input-snapshot.json'), snapshot);
    const inventory = await inspectFeature(app, settings, featureKey);
    saveJson(join(directory, 'current-inventory.json'), inventory);
    writeFileSync(
      join(directory, 'report.md'),
      [
        `# Captured input: ${featureKey}`,
        '',
        'This is a real capture, not a read-only preview. Selected files may now have firstUsedAt set.',
        'No AnalysisRun was created. Prepared context is not generated; the provider request is not rendered.',
        '',
        '## Specification',
        '',
        snapshot.feature.title,
        '',
        snapshot.feature.specificationContent,
        '',
        '## Feature context',
        '',
        snapshot.featureContext.content,
        '',
        '## Project context',
        '',
        snapshot.projectContext?.content ?? '(none)',
        '',
        '## Selected files and exact representations',
        '',
        json(snapshot.files),
        '',
        '## Repository revision, manifest, and captured content',
        '',
        json(snapshot.repository),
        '',
        '## Analysis settings',
        '',
        json(snapshot.analysisSettings),
        '',
        '## Diagnostic inventory (observed after capture; not part of snapshot)',
        '',
        json(inventory.files),
      ].join('\n'),
      { flag: 'wx' },
    );
    if (attachments) {
      const storage = app.get(StorageService);
      for (const file of snapshot.files) {
        for (const [kind, representation] of [
          ['original', file.original],
          ['prepared', file.prepared],
        ] as const) {
          if (!representation) continue;
          if (!representation.s3VersionId)
            throw new Error('Captured representation has no exact version');
          const bytes = await storage.getObjectBytes(
            representation.s3Key,
            representation.s3VersionId,
          );
          if (
            bytes.length !== representation.sizeBytes ||
            createHash('sha256').update(bytes).digest('base64') !==
              representation.checksumSha256
          )
            throw new Error(
              `Representation mismatch: ${file.publicKey}/${kind}`,
            );
          writeFileSync(
            join(directory, `${file.publicKey}-${kind}.bin`),
            bytes,
            { flag: 'wx' },
          );
        }
      }
    }
    saveJson(join(directory, 'result.json'), {
      status: 'passed',
      attachmentsRetrieved: attachments,
    });
    return { directory, snapshot };
  } catch (error) {
    saveJson(join(directory, 'result.json'), {
      status: 'failed',
      errorType: error instanceof Error ? error.name : 'unknown',
      details:
        'Capture or retrieval failed; inspect terminal error. Any successful snapshot export is preserved.',
    });
    console.error(`Capture evidence: ${directory}`);
    throw error;
  }
}

export function comparisonView(snapshot: AnalysisInputSnapshotV2) {
  const { capturedAt: _captureTime, ...input } = snapshot;
  void _captureTime;
  if (!input.repository) return input;
  const { capturedAt: _repositoryTime, ...repository } = input.repository;
  void _repositoryTime;
  return { ...input, repository };
}
