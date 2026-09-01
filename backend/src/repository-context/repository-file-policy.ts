import { createHash } from 'node:crypto';

import type { ProviderTreeEntry } from './ports/repository-provider.port';

export const MAX_SELECTED_FILES = 50;
export const MAX_SELECTED_FILE_BYTES = 1024 * 1024;
export const MAX_SELECTED_TOTAL_BYTES = 5 * 1024 * 1024;
export const MAX_ROOT_FILES = 20;
export const MAX_ROOT_FILE_BYTES = 256 * 1024;
export const MAX_ROOT_TOTAL_BYTES = 1024 * 1024;
export const MAX_MANIFEST_PATHS = 20_000;
export const MAX_MANIFEST_BYTES = 512 * 1024;
export const MAX_INSPECTED_ENTRIES = 100_000;
export const MAX_FALLBACK_TREE_CALLS = 2_000;
export const MAX_MANIFEST_BLOB_CALLS = 2_000;

const BLOCKED_DIRECTORIES = new Set([
  '.git',
  '.ssh',
  '.aws',
  '.terraform',
  'node_modules',
  'vendor',
  'third_party',
  'dist',
  'build',
  'out',
  'target',
  'bin',
  'obj',
  'coverage',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.cache',
  '.gradle',
  'pods',
  'deriveddata',
  'generated',
  'gen',
]);
const SENSITIVE_NAMES = new Set([
  '.npmrc',
  '.pypirc',
  '.netrc',
  'credentials',
  'credentials.json',
  'service-account.json',
  'service_account.json',
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
]);
const SENSITIVE_EXTENSIONS = new Set([
  '.pem',
  '.key',
  '.crt',
  '.cer',
  '.der',
  '.csr',
  '.p12',
  '.pfx',
  '.p7b',
  '.p7c',
  '.jks',
  '.keystore',
]);
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.bmp',
  '.tif',
  '.tiff',
  '.pdf',
  '.zip',
  '.gz',
  '.tgz',
  '.bz2',
  '.7z',
  '.rar',
  '.tar',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.o',
  '.a',
  '.class',
  '.jar',
  '.war',
  '.wasm',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.mp3',
  '.mp4',
  '.mov',
  '.avi',
  '.wav',
  '.flac',
  '.sqlite',
  '.db',
  '.pyc',
  '.pyo',
]);
const LOCKFILE_NAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lock',
  'bun.lockb',
  'poetry.lock',
  'cargo.lock',
  'go.sum',
  'gemfile.lock',
  'composer.lock',
]);

export type FileRejectionReason =
  | 'binary'
  | 'generated'
  | 'git_lfs_pointer'
  | 'invalid_path'
  | 'invalid_utf8'
  | 'file_too_large'
  | 'null_byte'
  | 'sensitive'
  | 'submodule'
  | 'symlink';

export function normalizeRepositoryPath(path: string): string {
  if (
    path.length === 0 ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.includes('\0') ||
    [...path].some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })
  )
    throw new Error('Repository path is not canonical');
  const segments = path.split('/');
  if (
    segments.some(
      (segment) => segment === '' || segment === '.' || segment === '..',
    )
  ) {
    throw new Error('Repository path is not canonical');
  }
  return path;
}

export function classifyTreeEntry(
  entry: ProviderTreeEntry,
): FileRejectionReason | null {
  let path: string;
  try {
    path = normalizeRepositoryPath(entry.path);
  } catch {
    return 'invalid_path';
  }
  const segments = path.toLowerCase().split('/');
  if (segments.slice(0, -1).some((segment) => BLOCKED_DIRECTORIES.has(segment)))
    return 'generated';
  const name = segments.at(-1) ?? '';
  if (entry.type === 'tree' && BLOCKED_DIRECTORIES.has(name))
    return 'generated';
  if (isSensitiveName(name)) return 'sensitive';
  if (
    name.endsWith('.map') ||
    name.endsWith('.min.js') ||
    name.endsWith('.min.css')
  )
    return 'generated';
  if (entry.type === 'commit' || entry.mode === '160000') return 'submodule';
  if (entry.mode === '120000') return 'symlink';
  if (entry.type !== 'blob') return null;
  if (BINARY_EXTENSIONS.has(extension(name))) return 'binary';
  return null;
}

export function validateTextBlob(
  bytes: Uint8Array,
): { content: string; checksumSha256: string } | FileRejectionReason {
  if (bytes.includes(0)) return 'null_byte';
  let content: string;
  try {
    content = new TextDecoder('utf-8', {
      fatal: true,
      ignoreBOM: true,
    }).decode(bytes);
  } catch {
    return 'invalid_utf8';
  }
  if (
    /^version https:\/\/git-lfs\.github\.com\/spec\/v1\r?\n/m.test(
      content.slice(0, 200),
    )
  )
    return 'git_lfs_pointer';
  return {
    content,
    checksumSha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

export function isAutomaticRootFile(path: string): boolean {
  if (path.includes('/')) return false;
  const name = path.toLowerCase();
  if (LOCKFILE_NAMES.has(name) || name.endsWith('.lock')) return false;
  return (
    /^(readme(?:\.(?:md|txt|rst))?|agents\.md|claude\.md)$/.test(name) ||
    /^(package\.json|pyproject\.toml|requirements\.txt|cargo\.toml|go\.mod|pom\.xml)$/.test(
      name,
    ) ||
    /^(build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?|dockerfile(?:\..+)?|docker-compose\.ya?ml|compose\.ya?ml|makefile|cmakelists\.txt)$/.test(
      name,
    ) ||
    /\.(?:sln|csproj|fsproj|vbproj)$/.test(name)
  );
}

export function automaticRootPriority(path: string): number {
  const name = path.toLowerCase();
  if (/^(readme|agents|claude)/.test(name)) return 0;
  if (
    /^(package\.json|pyproject\.toml|requirements\.txt|cargo\.toml|go\.mod|pom\.xml)$/.test(
      name,
    )
  )
    return 1;
  return 2;
}

export function manifestByteSize(paths: readonly string[]): number {
  return paths.reduce(
    (total, path, index) =>
      total + Buffer.byteLength(path, 'utf8') + (index === 0 ? 0 : 1),
    0,
  );
}

function isSensitiveName(name: string): boolean {
  if (
    name === '.env' ||
    (name.startsWith('.env.') && !/\.(example|sample|template)$/.test(name))
  )
    return true;
  if (
    SENSITIVE_NAMES.has(name) ||
    name.startsWith('secrets.') ||
    name.startsWith('credentials.')
  )
    return true;
  return SENSITIVE_EXTENSIONS.has(extension(name));
}

function extension(name: string): string {
  const index = name.lastIndexOf('.');
  return index < 0 ? '' : name.slice(index);
}
