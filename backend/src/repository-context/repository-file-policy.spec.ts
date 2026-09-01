import {
  classifyTreeEntry,
  isAutomaticRootFile,
  normalizeRepositoryPath,
  validateTextBlob,
} from './repository-file-policy';

function entry(
  path: string,
  mode = '100644',
  type: 'blob' | 'commit' | 'tree' = 'blob',
) {
  return { path, mode, type, sha: 'a'.repeat(40), sizeBytes: 10 };
}

describe('repository file policy v1', () => {
  it.each([
    ['.env', 'sensitive'],
    ['services/api/.env.production', 'sensitive'],
    ['.ssh/id_ed25519', 'generated'],
    ['src/private.pem', 'sensitive'],
    ['node_modules/pkg/index.js', 'generated'],
    ['dist/app.js', 'generated'],
    ['image.png', 'binary'],
  ])('filters %s before it can enter a manifest', (path, reason) => {
    expect(classifyTreeEntry(entry(path))).toBe(reason);
  });

  it.each(['.env.example', '.env.sample', '.env.template', 'src/index.ts'])(
    'allows non-sensitive text path %s',
    (path) => expect(classifyTreeEntry(entry(path))).toBeNull(),
  );

  it('rejects symlinks, submodules, invalid UTF-8, null bytes, and LFS pointers', () => {
    expect(classifyTreeEntry(entry('.ssh', '040000', 'tree'))).toBe(
      'generated',
    );
    expect(classifyTreeEntry(entry('link', '120000'))).toBe('symlink');
    expect(classifyTreeEntry(entry('module', '160000', 'commit'))).toBe(
      'submodule',
    );
    expect(validateTextBlob(Uint8Array.from([0xff]))).toBe('invalid_utf8');
    expect(validateTextBlob(Uint8Array.from([65, 0, 66]))).toBe('null_byte');
    expect(
      validateTextBlob(
        Buffer.from(
          'version https://git-lfs.github.com/spec/v1\noid sha256:x\nsize 1',
        ),
      ),
    ).toBe('git_lfs_pointer');
  });

  it('normalizes only canonical paths and limits automatic files to root non-lockfiles', () => {
    expect(normalizeRepositoryPath('src/index.ts')).toBe('src/index.ts');
    expect(() => normalizeRepositoryPath('../secret')).toThrow();
    expect(() => normalizeRepositoryPath('src\\index.ts')).toThrow();
    expect(isAutomaticRootFile('README.md')).toBe(true);
    expect(isAutomaticRootFile('package.json')).toBe(true);
    expect(isAutomaticRootFile('docs/README.md')).toBe(false);
    expect(isAutomaticRootFile('package-lock.json')).toBe(false);
  });

  it('preserves a UTF-8 BOM so content, byte size, and checksum share one representation', () => {
    const bytes = Uint8Array.from([0xef, 0xbb, 0xbf, 0x61]);
    const result = validateTextBlob(bytes);

    expect(result).toEqual({
      content: '\uFEFFa',
      checksumSha256: createHash('sha256').update(bytes).digest('hex'),
    });
    expect(
      Buffer.byteLength(typeof result === 'string' ? '' : result.content),
    ).toBe(bytes.byteLength);
  });
});
import { createHash } from 'node:crypto';
