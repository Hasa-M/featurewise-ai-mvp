import { createHash } from 'node:crypto';

import {
  ANALYSIS_INPUT_SNAPSHOT_VERSION_V2,
  ANALYSIS_SETTINGS_VERSION,
  AnalysisContractValidationError,
  createImmutableAnalysisInputSnapshotV2,
  createRepositoryRevisionSourceIdentifier,
  createSourceIdentifier,
  type AnalysisInputSnapshotV2,
} from './analysis-contracts';

function snapshot(
  content = 'export const value = 1;',
): AnalysisInputSnapshotV2 {
  return {
    contractVersion: ANALYSIS_INPUT_SNAPSHOT_VERSION_V2,
    capturedAt: '2026-08-31T12:00:00.000Z',
    feature: {
      publicKey: 'FEAT-1',
      projectKey: 'PRJ-1',
      specificationSourceId: createSourceIdentifier(
        'feature_specification',
        'FEAT-1',
      ),
      title: 'Repository context',
      specificationContent: 'Analyze the configured repository context.',
    },
    featureContext: {
      publicKey: 'CTX-1',
      sourceId: createSourceIdentifier('feature_context', 'CTX-1'),
      content: '',
    },
    projectContext: null,
    files: [],
    analysisSettings: {
      contractVersion: ANALYSIS_SETTINGS_VERSION,
      parameters: {},
    },
    repository: {
      publicKey: 'REPO-1',
      sourceId: createRepositoryRevisionSourceIdentifier('REPO-1'),
      fullName: 'featurewise/private-repository',
      branch: 'main',
      commitSha: 'a'.repeat(40),
      capturedAt: '2026-08-31T12:00:00.000Z',
      manifest: { paths: ['README.md', 'src/index.ts'], truncated: false },
      files: [
        {
          path: 'src/index.ts',
          roles: ['feature_selected'],
          blobSha: 'b'.repeat(40),
          sizeBytes: Buffer.byteLength(content),
          checksumSha256: createHash('sha256').update(content).digest('hex'),
          content,
        },
      ],
    },
  };
}

describe('analysis input snapshot v2', () => {
  it('preserves v1 sources and freezes exact repository revision bytes', () => {
    const result = createImmutableAnalysisInputSnapshotV2(snapshot());
    expect(result.repository?.files[0]?.content).toBe(
      'export const value = 1;',
    );
    expect(result.repository?.sourceId).toBe('repository_revision:REPO-1');
    expect(Object.isFrozen(result.repository?.files[0])).toBe(true);
  });

  it('rejects content that does not match its checksum', () => {
    const invalid = snapshot();
    const repository = invalid.repository;
    if (repository === null)
      throw new Error('test fixture must include repository');
    const changed = {
      ...invalid,
      repository: {
        ...repository,
        files: [{ ...repository.files[0], checksumSha256: '0'.repeat(64) }],
      },
    };
    expect(() => createImmutableAnalysisInputSnapshotV2(changed)).toThrow(
      AnalysisContractValidationError,
    );
  });
});
