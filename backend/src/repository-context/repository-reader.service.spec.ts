import { BadRequestException, ConflictException } from '@nestjs/common';

import type {
  ProviderBlob,
  ProviderTreeEntry,
  RepositoryProviderPort,
} from './ports/repository-provider.port';
import { RepositoryReaderService } from './repository-reader.service';

const repository = {
  repositoryId: '9007199254740993',
  owner: 'featurewise',
  name: 'private-repository',
  fullName: 'featurewise/private-repository',
  private: true,
  defaultBranch: 'main',
};
const connection = {
  publicKey: 'REPO-1',
  installationId: '9007199254740995',
  repository,
};
const rootTreeSha = 't'.repeat(40);

function sha(label: string): string {
  return Buffer.from(label).toString('hex').padEnd(40, 'a').slice(0, 40);
}

function fixture(
  files: readonly [string, string][],
  options: { readonly recursiveTruncated?: boolean } = {},
) {
  const directoryShas = new Map<string, string>([['', rootTreeSha]]);
  for (const [path] of files) {
    const segments = path.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      const directory = segments.slice(0, index).join('/');
      if (!directoryShas.has(directory))
        directoryShas.set(directory, sha(`tree:${directory}`));
    }
  }
  const directories = new Map<string, ProviderTreeEntry[]>();
  for (const [directory, treeSha] of directoryShas) {
    const prefix = directory ? `${directory}/` : '';
    const children = new Map<string, ProviderTreeEntry>();
    for (const [path, content] of files) {
      if (!path.startsWith(prefix)) continue;
      const remainder = path.slice(prefix.length);
      const [name, ...rest] = remainder.split('/');
      if (rest.length > 0) {
        const childPath = directory ? `${directory}/${name}` : name;
        children.set(name, {
          path: name,
          mode: '040000',
          type: 'tree',
          sha: directoryShas.get(childPath)!,
          sizeBytes: null,
        });
      } else {
        children.set(name, {
          path: name,
          mode: '100644',
          type: 'blob',
          sha: sha(`blob:${path}`),
          sizeBytes: Buffer.byteLength(content),
        });
      }
    }
    directories.set(treeSha, [...children.values()]);
  }
  const recursiveEntries = files.map(([path, content]) => ({
    path,
    mode: '100644',
    type: 'blob' as const,
    sha: sha(`blob:${path}`),
    sizeBytes: Buffer.byteLength(content),
  }));
  const blobs = new Map(
    files.map(([path, content]) => {
      const bytes = Buffer.from(content);
      const blobSha = sha(`blob:${path}`);
      return [
        blobSha,
        {
          bytes,
          sha: blobSha,
          sizeBytes: bytes.byteLength,
        } satisfies ProviderBlob,
      ];
    }),
  );
  const provider = {
    resolveRevision: jest.fn().mockResolvedValue({
      commitSha: 'c'.repeat(40),
      treeSha: rootTreeSha,
    }),
    getTree: jest.fn(
      (_installation, _repository, treeSha: string, recursive: boolean) =>
        Promise.resolve(
          recursive
            ? {
                entries: recursiveEntries,
                truncated: options.recursiveTruncated ?? false,
              }
            : { entries: directories.get(treeSha) ?? [], truncated: false },
        ),
    ),
    getBlob: jest.fn((_installation, _repository, blobSha: string) =>
      Promise.resolve(blobs.get(blobSha)),
    ),
  };
  return {
    provider,
    reader: new RepositoryReaderService(
      provider as unknown as RepositoryProviderPort,
    ),
  };
}

describe('RepositoryReaderService', () => {
  it('captures one exact commit and deduplicates automatic selected files', async () => {
    const { provider, reader } = fixture([
      ['README.md', '# Private repository'],
      ['src/index.ts', 'export const value = 1;'],
      ['.env', 'SECRET=value'],
      ['image.png', 'not actually an image'],
    ]);
    const result = await reader.captureRevision(connection, 'main', [
      'README.md',
      'src/index.ts',
    ]);

    expect(result.commitSha).toBe('c'.repeat(40));
    expect(result.manifest.paths).toEqual(['README.md', 'src/index.ts']);
    expect(
      result.files.find((file) => file.path === 'README.md')?.roles,
    ).toEqual(['automatic_root', 'feature_selected']);
    expect(
      result.files.find((file) => file.path === 'src/index.ts')?.content,
    ).toBe('export const value = 1;');
    expect(provider.getBlob).toHaveBeenCalledTimes(2);
  });

  it('validates with non-recursive directory caches and downloads only selected blobs', async () => {
    const { provider, reader } = fixture([
      ['README.md', '# Repository'],
      ['src/index.ts', 'export const value = 1;'],
      ['src/other.ts', 'export const other = 2;'],
    ]);
    const resolved = await reader.resolveRevision(connection, 'main');

    await expect(
      reader.validateSelectedPaths(connection, resolved, ['src/index.ts']),
    ).resolves.toEqual([]);

    expect(provider.getBlob).toHaveBeenCalledTimes(1);
    expect(provider.getTree).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      true,
    );
  });

  it('reports only paths that are actually invalid', async () => {
    const { reader } = fixture([
      ['src/valid.ts', 'export const valid = true;'],
      ['src/.env', 'SECRET=value'],
    ]);
    const resolved = await reader.resolveRevision(connection, 'branch');

    await expect(
      reader.validateSelectedPaths(connection, resolved, [
        'src/valid.ts',
        'src/missing.ts',
        'src/.env',
      ]),
    ).resolves.toEqual([
      { path: 'src/.env', reason: 'sensitive' },
      { path: 'src/missing.ts', reason: 'missing_or_filtered' },
    ]);
  });

  it('captures a selected path directly even when recursive traversal is truncated', async () => {
    const { reader } = fixture(
      [
        ['README.md', '# Repository'],
        ['deep/source/selected.ts', 'selected content'],
      ],
      { recursiveTruncated: true },
    );

    const result = await reader.captureRevision(connection, 'main', [
      'deep/source/selected.ts',
    ]);

    expect(
      result.files.find((file) => file.path === 'deep/source/selected.ts')
        ?.content,
    ).toBe('selected content');
  });

  it('captures root policy files before a truncated manifest', async () => {
    const manyFiles: [string, string][] = [
      ['README.md', '# Priority root'],
      ...Array.from({ length: 2_010 }, (_, index): [string, string] => [
        `src/file-${String(index).padStart(4, '0')}.ts`,
        `export const value${index} = ${index};`,
      ]),
    ];
    const { reader } = fixture(manyFiles);

    const result = await reader.captureRevision(connection, 'main', []);

    expect(result.manifest.truncated).toBe(true);
    expect(
      result.files.find((file) => file.path === 'README.md')?.roles,
    ).toEqual(['automatic_root']);
  });

  it('fails the entire capture when a mandatory selected path is unavailable', async () => {
    const { reader } = fixture([['README.md', '# Repository']]);
    await expect(
      reader.captureRevision(connection, 'main', ['src/missing.ts']),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('enforces the 50-file limit before any GitHub call', async () => {
    const { provider, reader } = fixture([]);
    await expect(
      reader.captureRevision(
        connection,
        'main',
        Array.from({ length: 51 }, (_, index) => `src/file-${index}.ts`),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.resolveRevision).not.toHaveBeenCalled();
  });
});
