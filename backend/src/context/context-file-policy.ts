import path from 'node:path';

import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AssetType } from '@prisma/client';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_SELECTED_BYTES = 50 * 1024 * 1024;
export const MAX_SELECTED_FILES = 10;
export const MAX_TOTAL_FILES = 20;

export type FileFamily = 'document' | 'image' | 'pdf' | 'spreadsheet' | 'text';

export interface ContextFilePolicy {
  readonly assetType: AssetType;
  readonly canonicalMimeType: string;
  readonly extension: string;
  readonly family: FileFamily;
  readonly filename: string;
}

interface FormatDefinition {
  readonly family: FileFamily;
  readonly mimeType: string;
  readonly aliases?: readonly string[];
}

const FORMATS: Readonly<Record<string, FormatDefinition>> = {
  '.pdf': { family: 'pdf', mimeType: 'application/pdf' },
  '.doc': { family: 'document', mimeType: 'application/msword' },
  '.docx': {
    family: 'document',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  '.rtf': {
    family: 'document',
    mimeType: 'application/rtf',
    aliases: ['text/rtf'],
  },
  '.odt': {
    family: 'document',
    mimeType: 'application/vnd.oasis.opendocument.text',
  },
  '.ppt': { family: 'document', mimeType: 'application/vnd.ms-powerpoint' },
  '.pptx': {
    family: 'document',
    mimeType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  '.odp': {
    family: 'document',
    mimeType: 'application/vnd.oasis.opendocument.presentation',
  },
  '.xls': { family: 'spreadsheet', mimeType: 'application/vnd.ms-excel' },
  '.xlsx': {
    family: 'spreadsheet',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  '.ods': {
    family: 'spreadsheet',
    mimeType: 'application/vnd.oasis.opendocument.spreadsheet',
  },
  '.csv': { family: 'spreadsheet', mimeType: 'text/csv' },
  '.tsv': { family: 'spreadsheet', mimeType: 'text/tab-separated-values' },
  '.png': { family: 'image', mimeType: 'image/png' },
  '.jpg': { family: 'image', mimeType: 'image/jpeg' },
  '.jpeg': { family: 'image', mimeType: 'image/jpeg' },
  '.webp': { family: 'image', mimeType: 'image/webp' },
  '.txt': { family: 'text', mimeType: 'text/plain' },
  '.text': { family: 'text', mimeType: 'text/plain' },
  '.md': { family: 'text', mimeType: 'text/markdown', aliases: ['text/plain'] },
  '.markdown': { family: 'text', mimeType: 'text/markdown' },
  '.json': {
    family: 'text',
    mimeType: 'application/json',
    aliases: ['text/plain'],
  },
  '.jsonl': { family: 'text', mimeType: 'application/x-ndjson' },
  '.yaml': {
    family: 'text',
    mimeType: 'application/yaml',
    aliases: ['text/yaml', 'text/plain'],
  },
  '.yml': {
    family: 'text',
    mimeType: 'application/yaml',
    aliases: ['text/yaml', 'text/plain'],
  },
  '.xml': {
    family: 'text',
    mimeType: 'application/xml',
    aliases: ['text/xml', 'text/plain'],
  },
  '.html': { family: 'text', mimeType: 'text/html', aliases: ['text/plain'] },
  '.htm': { family: 'text', mimeType: 'text/html' },
  '.css': { family: 'text', mimeType: 'text/css' },
  '.scss': { family: 'text', mimeType: 'text/x-scss', aliases: ['text/plain'] },
  '.sql': {
    family: 'text',
    mimeType: 'application/x-sql',
    aliases: ['text/plain'],
  },
  '.graphql': {
    family: 'text',
    mimeType: 'application/graphql',
    aliases: ['text/plain'],
  },
  '.toml': {
    family: 'text',
    mimeType: 'application/toml',
    aliases: ['text/plain'],
  },
  '.ini': { family: 'text', mimeType: 'text/x-ini', aliases: ['text/plain'] },
  '.properties': {
    family: 'text',
    mimeType: 'text/x-properties',
    aliases: ['text/plain'],
  },
  '.js': {
    family: 'text',
    mimeType: 'text/javascript',
    aliases: ['application/javascript', 'text/plain'],
  },
  '.jsx': { family: 'text', mimeType: 'text/jsx', aliases: ['text/plain'] },
  '.ts': {
    family: 'text',
    mimeType: 'text/x-typescript',
    aliases: ['application/typescript', 'text/plain'],
  },
  '.tsx': { family: 'text', mimeType: 'text/tsx', aliases: ['text/plain'] },
  '.py': { family: 'text', mimeType: 'text/x-python', aliases: ['text/plain'] },
  '.java': { family: 'text', mimeType: 'text/x-java', aliases: ['text/plain'] },
  '.go': { family: 'text', mimeType: 'text/x-golang', aliases: ['text/plain'] },
  '.rs': { family: 'text', mimeType: 'text/x-rust', aliases: ['text/plain'] },
  '.c': { family: 'text', mimeType: 'text/x-c', aliases: ['text/plain'] },
  '.h': { family: 'text', mimeType: 'text/x-c', aliases: ['text/plain'] },
  '.cpp': { family: 'text', mimeType: 'text/x-c++', aliases: ['text/plain'] },
  '.cs': { family: 'text', mimeType: 'text/x-csharp', aliases: ['text/plain'] },
  '.rb': { family: 'text', mimeType: 'text/x-ruby', aliases: ['text/plain'] },
  '.php': { family: 'text', mimeType: 'text/x-php', aliases: ['text/plain'] },
  '.sh': {
    family: 'text',
    mimeType: 'text/x-shellscript',
    aliases: ['text/plain'],
  },
  '.zsh': { family: 'text', mimeType: 'text/x-zsh', aliases: ['text/plain'] },
  '.vue': { family: 'text', mimeType: 'text/x-vue', aliases: ['text/plain'] },
  '.svelte': {
    family: 'text',
    mimeType: 'text/x-svelte',
    aliases: ['text/plain'],
  },
  '.kt': {
    family: 'text',
    mimeType: 'text/x-kotlin',
    aliases: ['text/plain'],
  },
  '.swift': {
    family: 'text',
    mimeType: 'text/x-swift',
    aliases: ['text/plain'],
  },
  '.dart': {
    family: 'text',
    mimeType: 'text/x-dart',
    aliases: ['text/plain'],
  },
  '.tf': { family: 'text', mimeType: 'text/x-hcl', aliases: ['text/plain'] },
  '.tfvars': {
    family: 'text',
    mimeType: 'text/x-hcl',
    aliases: ['text/plain'],
  },
  '.proto': {
    family: 'text',
    mimeType: 'text/x-protobuf',
    aliases: ['text/plain'],
  },
  '.prisma': { family: 'text', mimeType: 'text/plain' },
  '.conf': { family: 'text', mimeType: 'text/plain' },
  '.log': { family: 'text', mimeType: 'text/plain' },
};

const SPECIAL_FILENAMES = new Set([
  '.editorconfig',
  '.env',
  '.gitignore',
  '.npmrc',
  'license',
  'dockerfile',
  'makefile',
  'procfile',
  'agents.md',
  'claude.md',
]);

export function resolveContextFilePolicy(
  filename: string,
  declaredMimeType: string,
): ContextFilePolicy {
  const safeFilename = sanitizeFilename(filename);
  const lowerFilename = safeFilename.toLowerCase();
  const extension = path.extname(lowerFilename);
  const definition =
    FORMATS[extension] ??
    (SPECIAL_FILENAMES.has(lowerFilename)
      ? { family: 'text' as const, mimeType: 'text/plain' }
      : undefined);

  if (definition === undefined) {
    throw new UnprocessableEntityException('File format is not supported');
  }

  const normalizedDeclaredMime = declaredMimeType.trim().toLowerCase();
  const acceptedMimeTypes = new Set([
    definition.mimeType,
    ...(definition.aliases ?? []),
    'application/octet-stream',
    '',
  ]);

  if (!acceptedMimeTypes.has(normalizedDeclaredMime)) {
    throw new UnprocessableEntityException(
      'Filename extension and MIME type do not match',
    );
  }

  return {
    assetType: definition.family === 'image' ? 'image' : 'file',
    canonicalMimeType: definition.mimeType,
    extension,
    family: definition.family,
    filename: safeFilename,
  };
}

function sanitizeFilename(filename: string): string {
  const basename = Array.from(path.basename(filename.trim()))
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 31 && codePoint !== 127;
    })
    .join('');
  const normalized = basename.replace(/\s+/g, ' ').slice(0, 180);

  if (normalized === '' || normalized === '.' || normalized === '..') {
    throw new BadRequestException('Filename is invalid');
  }

  return normalized;
}
