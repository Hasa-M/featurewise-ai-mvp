import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';

import {
  MAX_FALLBACK_TREE_CALLS,
  MAX_INSPECTED_ENTRIES,
  MAX_MANIFEST_BLOB_CALLS,
  MAX_MANIFEST_BYTES,
  MAX_MANIFEST_PATHS,
  MAX_ROOT_FILE_BYTES,
  MAX_ROOT_FILES,
  MAX_ROOT_TOTAL_BYTES,
  MAX_SELECTED_FILE_BYTES,
  MAX_SELECTED_FILES,
  MAX_SELECTED_TOTAL_BYTES,
  automaticRootPriority,
  classifyTreeEntry,
  isAutomaticRootFile,
  manifestByteSize,
  normalizeRepositoryPath,
  validateTextBlob,
  type FileRejectionReason,
} from './repository-file-policy';
import {
  REPOSITORY_PROVIDER_PORT,
  type ProviderBlob,
  type ProviderRepository,
  type ProviderRevision,
  type ProviderTreeEntry,
  type RepositoryProviderPort,
} from './ports/repository-provider.port';

export interface RepositoryConnectionInput {
  readonly publicKey: string;
  readonly installationId: string;
  readonly repository: ProviderRepository;
}

export interface CapturedRepositoryFile {
  readonly path: string;
  readonly roles: readonly ('automatic_root' | 'feature_selected')[];
  readonly blobSha: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly content: string;
}

export interface CapturedRepositoryRevision {
  readonly publicKey: string;
  readonly fullName: string;
  readonly branch: string;
  readonly commitSha: string;
  readonly capturedAt: string;
  readonly manifest: {
    readonly paths: readonly string[];
    readonly truncated: boolean;
  };
  readonly files: readonly CapturedRepositoryFile[];
}

export type RepositoryPathImpactReason =
  | FileRejectionReason
  | 'missing_or_filtered'
  | 'selected_total_too_large';

export interface RepositoryPathImpact {
  readonly path: string;
  readonly reason: RepositoryPathImpactReason;
}

/** Request-scoped revision and caches shared by related validations. */
export interface ResolvedRepositoryRevision {
  readonly branch: string;
  readonly revision: ProviderRevision;
  readonly directoryCache: Map<string, Promise<readonly ProviderTreeEntry[]>>;
  readonly blobCache: Map<string, Promise<ProviderBlob>>;
}

@Injectable()
export class RepositoryReaderService {
  constructor(
    @Inject(REPOSITORY_PROVIDER_PORT)
    private readonly provider: RepositoryProviderPort,
  ) {}

  async resolveRevision(
    connection: RepositoryConnectionInput,
    branch: string,
  ): Promise<ResolvedRepositoryRevision> {
    const revision = await this.provider.resolveRevision(
      connection.installationId,
      connection.repository,
      branch,
    );
    return {
      branch,
      revision,
      directoryCache: new Map(),
      blobCache: new Map(),
    };
  }

  async validateSelectedPaths(
    connection: RepositoryConnectionInput,
    resolved: ResolvedRepositoryRevision,
    paths: readonly string[],
  ): Promise<readonly RepositoryPathImpact[]> {
    const normalized = this.normalizeSelection(paths);
    return (await this.loadSelectedFiles(connection, resolved, normalized))
      .impacts;
  }

  async captureRevision(
    connection: RepositoryConnectionInput,
    branch: string,
    selectedPaths: readonly string[],
  ): Promise<CapturedRepositoryRevision> {
    const normalizedSelected = this.normalizeSelection(selectedPaths);
    const resolved = await this.resolveRevision(connection, branch);
    const selected = await this.loadSelectedFiles(
      connection,
      resolved,
      normalizedSelected,
    );
    if (selected.impacts.length > 0)
      throw this.selectionConflict(selected.impacts);

    // Root policy files are independent from the bounded manifest.
    const rootEntries = (
      await this.loadDirectory(connection, resolved, resolved.revision.treeSha)
    ).entries
      .filter(
        (entry) =>
          entry.type === 'blob' &&
          classifyTreeEntry(entry) === null &&
          isAutomaticRootFile(entry.path),
      )
      .sort(
        (left, right) =>
          automaticRootPriority(left.path) -
            automaticRootPriority(right.path) ||
          left.path.localeCompare(right.path),
      );
    const automaticFiles: CapturedRepositoryFile[] = [];
    let automaticBytes = 0;
    for (const entry of rootEntries) {
      if (automaticFiles.length >= MAX_ROOT_FILES) break;
      if (entry.sizeBytes !== null && entry.sizeBytes > MAX_ROOT_FILE_BYTES)
        continue;
      const alreadySelected = selected.byPath.get(entry.path);
      const captured =
        alreadySelected ??
        (await this.loadAllowedFile(connection, resolved, entry));
      if (
        captured === null ||
        captured.sizeBytes > MAX_ROOT_FILE_BYTES ||
        automaticBytes + captured.sizeBytes > MAX_ROOT_TOTAL_BYTES
      )
        continue;
      automaticBytes += captured.sizeBytes;
      automaticFiles.push({ ...captured, roles: ['automatic_root'] });
    }

    // Manifest inspection has a separate blob budget from fallback traversal.
    const traversal = await this.loadManifestEntries(connection, resolved);
    const manifestPaths: string[] = [];
    let truncated = traversal.truncated;
    let manifestBlobCalls = 0;
    const sortedCandidates = traversal.entries
      .filter(
        (entry) => entry.type === 'blob' && classifyTreeEntry(entry) === null,
      )
      .sort((left, right) => left.path.localeCompare(right.path));

    for (const entry of sortedCandidates) {
      if (manifestPaths.length >= MAX_MANIFEST_PATHS) {
        truncated = true;
        break;
      }
      if (entry.sizeBytes !== null && entry.sizeBytes > MAX_SELECTED_FILE_BYTES)
        continue;

      let captured = selected.byPath.get(entry.path);
      captured ??= automaticFiles.find((file) => file.path === entry.path);
      if (!captured) {
        const alreadyCached = resolved.blobCache.has(entry.sha);
        if (!alreadyCached && manifestBlobCalls >= MAX_MANIFEST_BLOB_CALLS) {
          truncated = true;
          break;
        }
        const loaded = await this.loadAllowedFile(connection, resolved, entry);
        if (!alreadyCached) manifestBlobCalls += 1;
        if (loaded === null) continue;
        captured = loaded;
      }

      const nextPaths = [...manifestPaths, entry.path];
      if (manifestByteSize(nextPaths) > MAX_MANIFEST_BYTES) {
        truncated = true;
        break;
      }
      manifestPaths.push(entry.path);
    }

    const byPath = new Map<string, CapturedRepositoryFile>();
    for (const file of automaticFiles) byPath.set(file.path, file);
    for (const file of selected.files) {
      const current = byPath.get(file.path);
      byPath.set(
        file.path,
        current
          ? { ...file, roles: ['automatic_root', 'feature_selected'] }
          : file,
      );
    }

    return {
      publicKey: connection.publicKey,
      fullName: connection.repository.fullName,
      branch,
      commitSha: resolved.revision.commitSha,
      capturedAt: new Date().toISOString(),
      manifest: { paths: manifestPaths, truncated },
      files: [...byPath.values()].sort((left, right) =>
        left.path.localeCompare(right.path),
      ),
    };
  }

  async inspectDirectory(
    connection: RepositoryConnectionInput,
    branchOrCommit: string,
    path: string,
  ): Promise<{ commitSha: string; entries: readonly ProviderTreeEntry[] }> {
    const normalizedPath = path === '' ? '' : normalizeRepositoryPath(path);
    const resolved = await this.resolveRevision(connection, branchOrCommit);
    let treeSha = resolved.revision.treeSha;
    let prefix = '';
    for (const segment of normalizedPath ? normalizedPath.split('/') : []) {
      const tree = await this.loadDirectory(connection, resolved, treeSha);
      const next = tree.entries.find(
        (entry) => entry.type === 'tree' && entry.path === segment,
      );
      if (!next)
        throw new ConflictException(
          'Repository directory is unavailable at this revision',
        );
      prefix = prefix ? `${prefix}/${segment}` : segment;
      treeSha = next.sha;
    }
    const tree = await this.loadDirectory(connection, resolved, treeSha);
    return {
      commitSha: resolved.revision.commitSha,
      entries: tree.entries.map((entry) => ({
        ...entry,
        path: prefix ? `${prefix}/${entry.path}` : entry.path,
      })),
    };
  }

  private async loadSelectedFiles(
    connection: RepositoryConnectionInput,
    resolved: ResolvedRepositoryRevision,
    normalizedPaths: readonly string[],
  ): Promise<{
    readonly files: readonly CapturedRepositoryFile[];
    readonly byPath: ReadonlyMap<string, CapturedRepositoryFile>;
    readonly impacts: readonly RepositoryPathImpact[];
  }> {
    const files: CapturedRepositoryFile[] = [];
    const byPath = new Map<string, CapturedRepositoryFile>();
    const impacts: RepositoryPathImpact[] = [];
    let selectedBytes = 0;

    for (const path of normalizedPaths) {
      const located = await this.resolvePath(connection, resolved, path);
      if (located.reason) {
        impacts.push({ path, reason: located.reason });
        continue;
      }
      const entry = located.entry;
      if (!entry || entry.type !== 'blob') {
        impacts.push({ path, reason: 'missing_or_filtered' });
        continue;
      }
      const reason = classifyTreeEntry(entry);
      if (reason) {
        impacts.push({ path, reason });
        continue;
      }
      if (
        entry.sizeBytes !== null &&
        entry.sizeBytes > MAX_SELECTED_FILE_BYTES
      ) {
        impacts.push({ path, reason: 'file_too_large' });
        continue;
      }
      const blob = (await this.loadBlob(connection, resolved, entry.sha)).blob;
      if (blob.bytes.byteLength > MAX_SELECTED_FILE_BYTES) {
        impacts.push({ path, reason: 'file_too_large' });
        continue;
      }
      const validated = validateTextBlob(blob.bytes);
      if (typeof validated === 'string') {
        impacts.push({ path, reason: validated });
        continue;
      }
      selectedBytes += blob.bytes.byteLength;
      if (selectedBytes > MAX_SELECTED_TOTAL_BYTES) {
        impacts.push({ path, reason: 'selected_total_too_large' });
        continue;
      }
      const file: CapturedRepositoryFile = {
        path,
        roles: ['feature_selected'],
        blobSha: blob.sha,
        sizeBytes: blob.bytes.byteLength,
        ...validated,
      };
      files.push(file);
      byPath.set(path, file);
    }

    return { files, byPath, impacts };
  }

  private async resolvePath(
    connection: RepositoryConnectionInput,
    resolved: ResolvedRepositoryRevision,
    path: string,
  ): Promise<{
    readonly entry?: ProviderTreeEntry;
    readonly reason?: RepositoryPathImpactReason;
  }> {
    const segments = path.split('/');
    let treeSha = resolved.revision.treeSha;
    let prefix = '';
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const directory = await this.loadDirectory(connection, resolved, treeSha);
      const entry = directory.entries.find(
        (candidate) => candidate.path === segment,
      );
      if (!entry) return { reason: 'missing_or_filtered' };
      const expandedPath = prefix ? `${prefix}/${segment}` : segment;
      const expanded = { ...entry, path: expandedPath };
      if (index === segments.length - 1) return { entry: expanded };
      if (entry.type !== 'tree') return { reason: 'missing_or_filtered' };
      const reason = classifyTreeEntry(expanded);
      if (reason) return { reason };
      prefix = expandedPath;
      treeSha = entry.sha;
    }
    return { reason: 'missing_or_filtered' };
  }

  private async loadAllowedFile(
    connection: RepositoryConnectionInput,
    resolved: ResolvedRepositoryRevision,
    entry: ProviderTreeEntry,
  ): Promise<CapturedRepositoryFile | null> {
    const blob = (await this.loadBlob(connection, resolved, entry.sha)).blob;
    if (blob.bytes.byteLength > MAX_SELECTED_FILE_BYTES) return null;
    const validated = validateTextBlob(blob.bytes);
    if (typeof validated === 'string') return null;
    return {
      path: entry.path,
      roles: [],
      blobSha: blob.sha,
      sizeBytes: blob.bytes.byteLength,
      ...validated,
    };
  }

  private async loadManifestEntries(
    connection: RepositoryConnectionInput,
    resolved: ResolvedRepositoryRevision,
  ): Promise<{
    readonly entries: readonly ProviderTreeEntry[];
    readonly truncated: boolean;
  }> {
    const recursive = await this.provider.getTree(
      connection.installationId,
      connection.repository,
      resolved.revision.treeSha,
      true,
    );
    if (!recursive.truncated) {
      const entries = recursive.entries.slice(0, MAX_INSPECTED_ENTRIES);
      return {
        entries,
        truncated: recursive.entries.length > entries.length,
      };
    }

    const entries: ProviderTreeEntry[] = [];
    const queue: { readonly sha: string; readonly prefix: string }[] = [
      { sha: resolved.revision.treeSha, prefix: '' },
    ];
    let fallbackCalls = 0;
    while (
      queue.length > 0 &&
      entries.length < MAX_INSPECTED_ENTRIES &&
      fallbackCalls < MAX_FALLBACK_TREE_CALLS
    ) {
      const current = queue.shift();
      if (!current) break;
      const directory = await this.loadDirectory(
        connection,
        resolved,
        current.sha,
      );
      if (directory.fetched) fallbackCalls += 1;
      for (const entry of [...directory.entries].sort((left, right) =>
        left.path.localeCompare(right.path),
      )) {
        const path = current.prefix
          ? `${current.prefix}/${entry.path}`
          : entry.path;
        const expanded = { ...entry, path };
        entries.push(expanded);
        if (entry.type === 'tree' && classifyTreeEntry(expanded) === null)
          queue.push({ sha: entry.sha, prefix: path });
        if (entries.length >= MAX_INSPECTED_ENTRIES) break;
      }
    }
    return {
      entries,
      truncated:
        queue.length > 0 ||
        entries.length >= MAX_INSPECTED_ENTRIES ||
        fallbackCalls >= MAX_FALLBACK_TREE_CALLS,
    };
  }

  private async loadDirectory(
    connection: RepositoryConnectionInput,
    resolved: ResolvedRepositoryRevision,
    treeSha: string,
  ): Promise<{
    readonly entries: readonly ProviderTreeEntry[];
    readonly fetched: boolean;
  }> {
    const cached = resolved.directoryCache.get(treeSha);
    if (cached) return { entries: await cached, fetched: false };
    const pending = this.provider
      .getTree(connection.installationId, connection.repository, treeSha, false)
      .then((tree) => tree.entries);
    resolved.directoryCache.set(treeSha, pending);
    try {
      return { entries: await pending, fetched: true };
    } catch (error) {
      resolved.directoryCache.delete(treeSha);
      throw error;
    }
  }

  private async loadBlob(
    connection: RepositoryConnectionInput,
    resolved: ResolvedRepositoryRevision,
    blobSha: string,
  ): Promise<{ readonly blob: ProviderBlob; readonly fetched: boolean }> {
    const cached = resolved.blobCache.get(blobSha);
    if (cached) return { blob: await cached, fetched: false };
    const pending = this.provider.getBlob(
      connection.installationId,
      connection.repository,
      blobSha,
    );
    resolved.blobCache.set(blobSha, pending);
    try {
      return { blob: await pending, fetched: true };
    } catch (error) {
      resolved.blobCache.delete(blobSha);
      throw error;
    }
  }

  private normalizeSelection(paths: readonly string[]): readonly string[] {
    if (paths.length > MAX_SELECTED_FILES)
      throw new BadRequestException('Select at most 50 repository files');
    const normalized = paths.map((path) => {
      try {
        return normalizeRepositoryPath(path);
      } catch {
        throw new BadRequestException('Selected repository path is invalid');
      }
    });
    const unique = [...new Set(normalized)].sort();
    if (unique.length !== paths.length)
      throw new BadRequestException('Selected repository paths must be unique');
    return unique;
  }

  private selectionConflict(
    impacts: readonly RepositoryPathImpact[],
  ): ConflictException {
    return new ConflictException({
      code: 'REPOSITORY_BRANCH_IMPACT',
      message: 'One or more selected repository files are unavailable',
      details: { paths: impacts },
    });
  }
}
