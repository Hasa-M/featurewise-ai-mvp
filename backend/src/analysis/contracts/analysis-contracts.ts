export const ANALYSIS_SETTINGS_VERSION = 'analysis-settings-v1' as const;
export const ANALYSIS_INPUT_SNAPSHOT_VERSION =
  'analysis-input-snapshot-v1' as const;
export const PREPARED_CONTEXT_SNAPSHOT_VERSION =
  'prepared-context-snapshot-v1' as const;
export const ANALYSIS_ENGINE_INPUT_VERSION =
  'analysis-engine-input-v1' as const;
export const STRUCTURED_FINDING_OUTPUT_VERSION =
  'structured-finding-output-v1' as const;

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

export type AnalysisRunStatus =
  | 'queued'
  | 'preparing_context'
  | 'analyzing'
  | 'validating_output'
  | 'repairing_output'
  | 'verifying_findings'
  | 'persisting'
  | 'completed'
  | 'failed';

export type FindingReviewDecision =
  | 'accepted'
  | 'dismissed'
  | 'resolved'
  | 'deferred';

declare const VERSION_IDENTIFIER_BRAND: unique symbol;
export type VersionIdentifier = string & {
  readonly [VERSION_IDENTIFIER_BRAND]: 'VersionIdentifier';
};

declare const SOURCE_IDENTIFIER_BRAND: unique symbol;
export type SourceIdentifier = string & {
  readonly [SOURCE_IDENTIFIER_BRAND]: 'SourceIdentifier';
};

declare const SEGMENT_IDENTIFIER_BRAND: unique symbol;
export type SegmentIdentifier = string & {
  readonly [SEGMENT_IDENTIFIER_BRAND]: 'SegmentIdentifier';
};

declare const PREPARED_SNAPSHOT_IDENTIFIER_BRAND: unique symbol;
export type PreparedContextSnapshotIdentifier = string & {
  readonly [PREPARED_SNAPSHOT_IDENTIFIER_BRAND]: 'PreparedContextSnapshotIdentifier';
};

export const PREPARED_SOURCE_TYPES = [
  'feature_specification',
  'feature_context',
  'project_context',
  'uploaded_file',
] as const;

export type PreparedSourceType = (typeof PREPARED_SOURCE_TYPES)[number];

const SOURCE_PUBLIC_KEY_PREFIXES: Readonly<Record<PreparedSourceType, string>> =
  {
    feature_specification: 'FEAT',
    feature_context: 'CTX',
    project_context: 'PCTX',
    uploaded_file: 'OBJ',
  };
const VERSION_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const PUBLIC_KEY_NUMBER_PATTERN = /^[1-9][0-9]*$/;
const SEGMENT_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const PREPARED_SNAPSHOT_ID_PATTERN = /^pcs:[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const POSTGRES_INTEGER_MAX = 2_147_483_647;

export class AnalysisContractValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = AnalysisContractValidationError.name;
  }
}

export interface AnalysisSettingsV1 {
  readonly contractVersion: typeof ANALYSIS_SETTINGS_VERSION;
  readonly parameters: JsonObject;
}

export interface AnalysisLifecycleVersions {
  readonly analyzerVersion: VersionIdentifier;
  readonly promptVersion: VersionIdentifier;
  readonly schemaVersion: VersionIdentifier;
}

export interface SnapshotObjectRepresentation {
  readonly s3Key: string;
  readonly s3VersionId: string;
  readonly checksumSha256: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export interface SnapshotUploadedFile {
  readonly sourceId: SourceIdentifier;
  readonly publicKey: string;
  readonly assetType: 'file' | 'image';
  readonly filename: string;
  readonly preparationVersion: VersionIdentifier;
  readonly original: SnapshotObjectRepresentation;
  readonly prepared: SnapshotObjectRepresentation | null;
}

export interface AnalysisInputSnapshotV1 {
  readonly contractVersion: typeof ANALYSIS_INPUT_SNAPSHOT_VERSION;
  readonly capturedAt: string;
  readonly feature: {
    readonly publicKey: string;
    readonly projectKey: string;
    readonly specificationSourceId: SourceIdentifier;
    readonly title: string;
    readonly specificationContent: string;
  };
  readonly featureContext: {
    readonly publicKey: string;
    readonly sourceId: SourceIdentifier;
    readonly content: string;
  };
  readonly projectContext: {
    readonly publicKey: string;
    readonly sourceId: SourceIdentifier;
    readonly content: string;
  } | null;
  readonly files: readonly SnapshotUploadedFile[];
  readonly analysisSettings: AnalysisSettingsV1;
}

export interface PreparedContextSegment {
  readonly segmentId: SegmentIdentifier;
  readonly position: number;
  readonly content: string;
  readonly metadata: JsonObject;
}

export interface PreparedContextSource {
  readonly sourceId: SourceIdentifier;
  readonly sourceType: PreparedSourceType;
  readonly title: string;
  readonly metadata: JsonObject;
  readonly segments: readonly PreparedContextSegment[];
}

export interface PreparedContextSnapshotV1 {
  readonly contractVersion: typeof PREPARED_CONTEXT_SNAPSHOT_VERSION;
  readonly snapshotId: PreparedContextSnapshotIdentifier;
  readonly inputSnapshotVersion: typeof ANALYSIS_INPUT_SNAPSHOT_VERSION;
  readonly sources: readonly PreparedContextSource[];
}

export interface EvidenceReference {
  readonly sourceId: SourceIdentifier;
  readonly segmentId: SegmentIdentifier;
  readonly locator?: string;
}

export interface SnapshotScopedEvidence {
  readonly preparedContextSnapshotId: PreparedContextSnapshotIdentifier;
  readonly references: readonly EvidenceReference[];
}

export interface AnalysisEngineInputV1 {
  readonly contractVersion: typeof ANALYSIS_ENGINE_INPUT_VERSION;
  readonly versions: AnalysisLifecycleVersions;
  readonly analysisSettings: AnalysisSettingsV1;
  readonly preparedContext: PreparedContextSnapshotV1;
}

export interface StructuredFindingDraftV1 {
  readonly category: string;
  readonly severity: string;
  readonly title: string;
  readonly description: string;
  readonly whyItMatters: string;
  readonly evidence: SnapshotScopedEvidence;
  readonly suggestedResolutions: readonly string[];
}

export interface StructuredFindingOutputV1 {
  readonly contractVersion: typeof STRUCTURED_FINDING_OUTPUT_VERSION;
  readonly schemaVersion: VersionIdentifier;
  readonly findings: readonly StructuredFindingDraftV1[];
}

export interface ResolvedEvidenceReference {
  readonly reference: EvidenceReference;
  readonly source: PreparedContextSource;
  readonly segment: PreparedContextSegment;
}

export function parseVersionIdentifier(value: string): VersionIdentifier {
  if (!VERSION_IDENTIFIER_PATTERN.test(value)) {
    throw new AnalysisContractValidationError(
      'Version identifier must be a non-empty opaque identifier',
    );
  }

  return value as VersionIdentifier;
}

export function createSourceIdentifier(
  sourceType: PreparedSourceType,
  publicKey: string,
): SourceIdentifier {
  assertPublicKey(publicKey, SOURCE_PUBLIC_KEY_PREFIXES[sourceType]);

  return `${sourceType}:${publicKey}` as SourceIdentifier;
}

export function parsePreparedContextSnapshotIdentifier(
  value: string,
): PreparedContextSnapshotIdentifier {
  if (!PREPARED_SNAPSHOT_ID_PATTERN.test(value)) {
    throw new AnalysisContractValidationError(
      'Prepared-context snapshot identifier is invalid',
    );
  }

  return value as PreparedContextSnapshotIdentifier;
}

export function createSegmentIdentifier(
  sourceId: SourceIdentifier,
  token: string,
): SegmentIdentifier {
  if (!SEGMENT_TOKEN_PATTERN.test(token)) {
    throw new AnalysisContractValidationError('Segment token is invalid');
  }

  return `segment:${sourceId}:${token}` as SegmentIdentifier;
}

export function createImmutableAnalysisInputSnapshot(
  snapshot: AnalysisInputSnapshotV1,
): AnalysisInputSnapshotV1 {
  const detached = structuredClone(snapshot);

  validateAnalysisInputSnapshot(detached);

  return deepFreeze(detached);
}

export function createImmutablePreparedContextSnapshot(
  snapshot: PreparedContextSnapshotV1,
): PreparedContextSnapshotV1 {
  const detached = structuredClone(snapshot);

  validatePreparedContextSnapshot(detached);

  return deepFreeze(detached);
}

export function validateAnalysisInputSnapshot(
  snapshot: AnalysisInputSnapshotV1,
): void {
  if (snapshot.contractVersion !== ANALYSIS_INPUT_SNAPSHOT_VERSION) {
    throw new AnalysisContractValidationError(
      'Analysis input snapshot contract version is unsupported',
    );
  }
  assertIsoTimestamp(snapshot.capturedAt);
  assertPublicKey(snapshot.feature.publicKey, 'FEAT');
  assertPublicKey(snapshot.feature.projectKey, 'PRJ');
  assertSourceIdentifier(
    snapshot.feature.specificationSourceId,
    'feature_specification',
    snapshot.feature.publicKey,
  );
  assertPublicKey(snapshot.featureContext.publicKey, 'CTX');
  assertSourceIdentifier(
    snapshot.featureContext.sourceId,
    'feature_context',
    snapshot.featureContext.publicKey,
  );

  if (snapshot.projectContext !== null) {
    assertPublicKey(snapshot.projectContext.publicKey, 'PCTX');
    assertSourceIdentifier(
      snapshot.projectContext.sourceId,
      'project_context',
      snapshot.projectContext.publicKey,
    );
  }

  validateAnalysisSettings(snapshot.analysisSettings);
  const sourceIds = new Set<string>([
    snapshot.feature.specificationSourceId,
    snapshot.featureContext.sourceId,
    ...(snapshot.projectContext === null
      ? []
      : [snapshot.projectContext.sourceId]),
  ]);
  let previousPublicNumber = 0;

  for (const file of snapshot.files) {
    const publicNumber = assertPublicKey(file.publicKey, 'OBJ');

    if (publicNumber <= previousPublicNumber) {
      throw new AnalysisContractValidationError(
        'Snapshot files must be ordered by immutable public number',
      );
    }
    previousPublicNumber = publicNumber;
    assertSourceIdentifier(file.sourceId, 'uploaded_file', file.publicKey);

    if (sourceIds.has(file.sourceId)) {
      throw new AnalysisContractValidationError(
        'Analysis input source identifiers must be unique',
      );
    }
    sourceIds.add(file.sourceId);
    parseVersionIdentifier(file.preparationVersion);
    validateObjectRepresentation(file.original);

    if (file.prepared !== null) {
      validateObjectRepresentation(file.prepared);
    }
  }
}

export function validatePreparedContextSnapshot(
  snapshot: PreparedContextSnapshotV1,
): void {
  if (snapshot.contractVersion !== PREPARED_CONTEXT_SNAPSHOT_VERSION) {
    throw new AnalysisContractValidationError(
      'Prepared-context snapshot contract version is unsupported',
    );
  }
  if (snapshot.inputSnapshotVersion !== ANALYSIS_INPUT_SNAPSHOT_VERSION) {
    throw new AnalysisContractValidationError(
      'Prepared context references an unsupported input snapshot version',
    );
  }
  parsePreparedContextSnapshotIdentifier(snapshot.snapshotId);
  const sourceIds = new Set<string>();
  const segmentIds = new Set<string>();

  for (const source of snapshot.sources) {
    const separatorIndex = source.sourceId.indexOf(':');
    const publicKey = source.sourceId.slice(separatorIndex + 1);

    assertSourceIdentifier(source.sourceId, source.sourceType, publicKey);
    assertJsonObject(source.metadata);

    if (sourceIds.has(source.sourceId)) {
      throw new AnalysisContractValidationError(
        'Prepared source identifiers must be unique',
      );
    }
    sourceIds.add(source.sourceId);

    source.segments.forEach((segment, index) => {
      if (segment.position !== index) {
        throw new AnalysisContractValidationError(
          'Prepared segments must use contiguous ordered positions',
        );
      }
      assertSegmentIdentifier(segment.segmentId, source.sourceId);
      assertJsonObject(segment.metadata);

      if (segmentIds.has(segment.segmentId)) {
        throw new AnalysisContractValidationError(
          'Prepared segment identifiers must be unique in one snapshot',
        );
      }
      segmentIds.add(segment.segmentId);
    });
  }
}

export function resolveEvidenceReferences(
  snapshot: PreparedContextSnapshotV1,
  evidence: SnapshotScopedEvidence,
): readonly ResolvedEvidenceReference[] {
  validatePreparedContextSnapshot(snapshot);

  if (evidence.preparedContextSnapshotId !== snapshot.snapshotId) {
    throw new AnalysisContractValidationError(
      'Evidence belongs to a different prepared-context snapshot',
    );
  }

  const sources = new Map(
    snapshot.sources.map((source) => [source.sourceId, source]),
  );

  return evidence.references.map((reference) => {
    const source = sources.get(reference.sourceId);

    if (source === undefined) {
      throw new AnalysisContractValidationError(
        `Evidence source ${reference.sourceId} is missing`,
      );
    }
    assertSegmentIdentifier(reference.segmentId, reference.sourceId);
    const segment = source.segments.find(
      (candidate) => candidate.segmentId === reference.segmentId,
    );

    if (segment === undefined) {
      throw new AnalysisContractValidationError(
        `Evidence segment ${reference.segmentId} is missing`,
      );
    }

    return { reference, source, segment };
  });
}

export function validateAnalysisSettings(settings: AnalysisSettingsV1): void {
  if (settings.contractVersion !== ANALYSIS_SETTINGS_VERSION) {
    throw new AnalysisContractValidationError(
      'Analysis settings contract version is unsupported',
    );
  }
  assertJsonObject(settings.parameters);
}

function assertSourceIdentifier(
  sourceId: SourceIdentifier,
  sourceType: PreparedSourceType,
  publicKey: string,
): void {
  const expected = createSourceIdentifier(sourceType, publicKey);

  if (sourceId !== expected) {
    throw new AnalysisContractValidationError(
      `Source identifier must equal ${expected}`,
    );
  }
}

function assertSegmentIdentifier(
  segmentId: SegmentIdentifier,
  sourceId: SourceIdentifier,
): void {
  const expectedPrefix = `segment:${sourceId}:`;
  const token = segmentId.slice(expectedPrefix.length);

  if (
    !segmentId.startsWith(expectedPrefix) ||
    !SEGMENT_TOKEN_PATTERN.test(token)
  ) {
    throw new AnalysisContractValidationError(
      'Segment identifier must be stable and scoped to its source',
    );
  }
}

function assertPublicKey(value: string, expectedPrefix: string): number {
  const prefix = `${expectedPrefix}-`;
  const numericPart = value.slice(prefix.length);

  if (
    !value.startsWith(prefix) ||
    !PUBLIC_KEY_NUMBER_PATTERN.test(numericPart)
  ) {
    throw new AnalysisContractValidationError(
      `Expected a ${expectedPrefix} public key`,
    );
  }
  const publicNumber = Number(numericPart);

  if (publicNumber > POSTGRES_INTEGER_MAX) {
    throw new AnalysisContractValidationError(
      `Expected a ${expectedPrefix} public key`,
    );
  }

  return publicNumber;
}

function validateObjectRepresentation(
  representation: SnapshotObjectRepresentation,
): void {
  for (const value of [
    representation.s3Key,
    representation.s3VersionId,
    representation.checksumSha256,
    representation.mimeType,
  ]) {
    if (value === '') {
      throw new AnalysisContractValidationError(
        'Captured storage metadata must be complete',
      );
    }
  }

  if (
    !Number.isSafeInteger(representation.sizeBytes) ||
    representation.sizeBytes <= 0
  ) {
    throw new AnalysisContractValidationError(
      'Captured storage byte size must be a positive safe integer',
    );
  }
}

function assertIsoTimestamp(value: string): void {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) {
    throw new AnalysisContractValidationError(
      'Capture timestamp must be an ISO-8601 instant',
    );
  }
}

function assertJsonObject(value: JsonObject): void {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new AnalysisContractValidationError('Expected a JSON object');
  }

  for (const entry of Object.values(value)) {
    assertJsonValue(entry);
  }
}

function assertJsonValue(value: JsonValue): void {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new AnalysisContractValidationError('JSON numbers must be finite');
    }

    return;
  }
  if (Array.isArray(value)) {
    (value as readonly JsonValue[]).forEach(assertJsonValue);
    return;
  }
  if (typeof value === 'object') {
    assertJsonObject(value as JsonObject);
    return;
  }

  throw new AnalysisContractValidationError('Value is not JSON-compatible');
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach((child) =>
      deepFreeze(child),
    );
    Object.freeze(value);
  }

  return value;
}
