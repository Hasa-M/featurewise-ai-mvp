import {
  ANALYSIS_INPUT_SNAPSHOT_VERSION,
  ANALYSIS_SETTINGS_VERSION,
  PREPARED_CONTEXT_SNAPSHOT_VERSION,
  PREPARED_SOURCE_TYPES,
  AnalysisContractValidationError,
  createImmutableAnalysisInputSnapshot,
  createImmutablePreparedContextSnapshot,
  createSegmentIdentifier,
  createSourceIdentifier,
  parsePreparedContextSnapshotIdentifier,
  resolveEvidenceReferences,
  type AnalysisInputSnapshotV1,
  type PreparedContextSnapshotV1,
} from './analysis-contracts';

const specificationSourceId = createSourceIdentifier(
  'feature_specification',
  'FEAT-1',
);
const contextSourceId = createSourceIdentifier('feature_context', 'CTX-1');
const snapshotId = parsePreparedContextSnapshotIdentifier('pcs:test-run-1');

function createPreparedSnapshot(): PreparedContextSnapshotV1 {
  return {
    contractVersion: PREPARED_CONTEXT_SNAPSHOT_VERSION,
    snapshotId,
    inputSnapshotVersion: ANALYSIS_INPUT_SNAPSHOT_VERSION,
    sources: [
      {
        sourceId: specificationSourceId,
        sourceType: 'feature_specification',
        title: 'Specification',
        metadata: {},
        segments: [
          {
            segmentId: createSegmentIdentifier(
              specificationSourceId,
              'acceptance-criteria',
            ),
            position: 0,
            content: 'The checkout completes successfully.',
            metadata: {},
          },
        ],
      },
      {
        sourceId: contextSourceId,
        sourceType: 'feature_context',
        title: 'Feature context',
        metadata: {},
        segments: [
          {
            segmentId: createSegmentIdentifier(contextSourceId, 'notes'),
            position: 0,
            content: 'Supporting notes',
            metadata: {},
          },
        ],
      },
    ],
  };
}

function createInputSnapshot(): AnalysisInputSnapshotV1 {
  return {
    contractVersion: ANALYSIS_INPUT_SNAPSHOT_VERSION,
    capturedAt: '2026-08-29T12:00:00.000Z',
    feature: {
      publicKey: 'FEAT-1',
      projectKey: 'PRJ-1',
      specificationSourceId,
      title: 'Checkout',
      specificationContent: '',
    },
    featureContext: {
      publicKey: 'CTX-1',
      sourceId: contextSourceId,
      content: '',
    },
    projectContext: null,
    files: [],
    analysisSettings: {
      contractVersion: ANALYSIS_SETTINGS_VERSION,
      parameters: {},
    },
  };
}

describe('analysis contracts', () => {
  it('keeps the initial prepared source vocabulary exact', () => {
    expect(PREPARED_SOURCE_TYPES).toEqual([
      'feature_specification',
      'feature_context',
      'project_context',
      'uploaded_file',
    ]);
  });

  it('creates a detached, deeply immutable input snapshot', () => {
    const mutable = createInputSnapshot();
    const snapshot = createImmutableAnalysisInputSnapshot(mutable);

    (
      mutable.feature as {
        specificationContent: string;
      }
    ).specificationContent = 'Later edit';

    expect(snapshot.feature.specificationContent).toBe('');
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.feature)).toBe(true);
    expect(() => {
      (snapshot.feature as { title: string }).title = 'Mutation';
    }).toThrow(TypeError);
  });

  it('resolves evidence only inside the exact prepared snapshot', () => {
    const snapshot = createImmutablePreparedContextSnapshot(
      createPreparedSnapshot(),
    );
    const reference = {
      sourceId: specificationSourceId,
      segmentId: createSegmentIdentifier(
        specificationSourceId,
        'acceptance-criteria',
      ),
      locator: 'Acceptance criteria',
    };

    const resolved = resolveEvidenceReferences(snapshot, {
      preparedContextSnapshotId: snapshot.snapshotId,
      references: [reference],
    });

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.reference).toEqual(reference);
    expect(resolved[0]?.source.sourceId).toBe(specificationSourceId);
    expect(resolved[0]?.segment.content).toBe(
      'The checkout completes successfully.',
    );

    expect(() =>
      resolveEvidenceReferences(snapshot, {
        preparedContextSnapshotId:
          parsePreparedContextSnapshotIdentifier('pcs:another-run'),
        references: [reference],
      }),
    ).toThrow('different prepared-context snapshot');
  });

  it('rejects missing and cross-source evidence segments', () => {
    const snapshot = createPreparedSnapshot();

    expect(() =>
      resolveEvidenceReferences(snapshot, {
        preparedContextSnapshotId: snapshot.snapshotId,
        references: [
          {
            sourceId: contextSourceId,
            segmentId: createSegmentIdentifier(
              contextSourceId,
              'missing-segment',
            ),
          },
        ],
      }),
    ).toThrow('is missing');

    expect(() =>
      resolveEvidenceReferences(snapshot, {
        preparedContextSnapshotId: snapshot.snapshotId,
        references: [
          {
            sourceId: contextSourceId,
            segmentId: createSegmentIdentifier(
              specificationSourceId,
              'acceptance-criteria',
            ),
          },
        ],
      }),
    ).toThrow('scoped to its source');
  });

  it('rejects duplicate sources and unordered segments', () => {
    const snapshot = createPreparedSnapshot();
    const duplicate = {
      ...snapshot,
      sources: [snapshot.sources[0], snapshot.sources[0]],
    };

    expect(() => createImmutablePreparedContextSnapshot(duplicate)).toThrow(
      AnalysisContractValidationError,
    );

    const unordered = createPreparedSnapshot();
    const source = unordered.sources[0];
    const invalid = {
      ...unordered,
      sources: [
        {
          ...source,
          segments: [{ ...source.segments[0], position: 1 }],
        },
      ],
    };

    expect(() => createImmutablePreparedContextSnapshot(invalid)).toThrow(
      'contiguous ordered positions',
    );
  });
});
