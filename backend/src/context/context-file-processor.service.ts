import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageObjectStatus } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

import type { StorageConfig } from '../config/storage.config';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  resolveContextFilePolicy,
  type ContextFilePolicy,
} from './context-file-policy';

const IMAGE_PREPARATION_VERSION = 'image-v1';
const DOCUMENT_PREPARATION_VERSION = 'document-pdf-v1';
const ORIGINAL_PREPARATION_VERSION = 'original';

export function createLibreOfficeUserInstallationArgument(
  profileDirectory: string,
): string {
  return `-env:UserInstallation=${pathToFileURL(profileDirectory).href}`;
}

@Injectable()
export class ContextFileProcessorService implements OnApplicationBootstrap {
  private readonly config: StorageConfig;
  private readonly logger = new Logger(ContextFileProcessorService.name);

  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
  ) {
    this.config = configService.getOrThrow<StorageConfig>('storage');
  }

  async onApplicationBootstrap(): Promise<void> {
    try {
      const interrupted = await this.prismaService.storageObject.findMany({
        where: {
          purgeRequestedAt: null,
          status: StorageObjectStatus.processing,
        },
        orderBy: { updatedAt: 'asc' },
        take: 100,
      });

      interrupted.forEach((storageObject) => this.start(storageObject.id));
    } catch (error: unknown) {
      this.logger.warn(
        `Could not resume interrupted file preparation: ${
          error instanceof Error ? error.message : 'unknown database error'
        }`,
      );
    }
  }

  start(storageObjectId: string): void {
    void this.process(storageObjectId).catch((error: unknown) => {
      this.logger.error(
        `Context file processing escaped its guard for ${storageObjectId}`,
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  async process(storageObjectId: string): Promise<void> {
    const storageObject = await this.prismaService.storageObject.findUnique({
      where: { id: storageObjectId },
    });

    if (
      storageObject === null ||
      storageObject.status !== StorageObjectStatus.processing ||
      storageObject.purgeRequestedAt !== null
    ) {
      return;
    }

    let preparedObject: {
      readonly key: string;
      readonly versionId: string;
    } | null = null;

    try {
      const policy = resolveContextFilePolicy(
        storageObject.originalFilename,
        storageObject.mimeType,
      );
      const bytes = await this.storageService.getObjectBytes(
        storageObject.s3Key,
        storageObject.s3VersionId,
      );

      await this.validateBytes(bytes, policy);
      const prepared = await this.prepareBytes(bytes, policy);
      let preparedFields: {
        preparedChecksumSha256?: string;
        preparedMimeType?: string;
        preparedS3Key?: string;
        preparedS3VersionId?: string;
        preparedSizeBytes?: bigint;
      } = {};

      if (prepared !== null) {
        const preparedKey = this.storageService.createPreparedKey(
          this.preparedPrefix(storageObject.s3Key),
          prepared.version,
        );
        const checksumSha256 = this.sha256Base64(prepared.bytes);
        const stored = await this.storageService.putObject({
          body: prepared.bytes,
          checksumSha256,
          contentType: prepared.mimeType,
          key: preparedKey,
        });

        if (stored.versionId === null) {
          throw new Error('Prepared S3 object has no version identifier');
        }
        preparedObject = {
          key: preparedKey,
          versionId: stored.versionId,
        };

        preparedFields = {
          preparedChecksumSha256: checksumSha256,
          preparedMimeType: prepared.mimeType,
          preparedS3Key: preparedKey,
          preparedS3VersionId: stored.versionId,
          preparedSizeBytes: BigInt(prepared.bytes.byteLength),
        };
      }

      const finalized = await this.prismaService.storageObject.updateMany({
        where: {
          id: storageObject.id,
          purgeRequestedAt: null,
          status: StorageObjectStatus.processing,
        },
        data: {
          ...preparedFields,
          preparationVersion: prepared?.version ?? ORIGINAL_PREPARATION_VERSION,
          readyAt: new Date(),
          status: StorageObjectStatus.ready,
        },
      });

      if (
        finalized.count === 0 &&
        preparedFields.preparedS3Key &&
        preparedFields.preparedS3VersionId
      ) {
        await this.storageService.deleteObject(
          preparedFields.preparedS3Key,
          preparedFields.preparedS3VersionId,
        );
      }
      preparedObject = null;
    } catch (error: unknown) {
      if (preparedObject !== null) {
        await this.storageService
          .deleteObject(preparedObject.key, preparedObject.versionId)
          .catch(() => undefined);
      }
      const message =
        error instanceof Error
          ? error.message.slice(0, 500)
          : 'Processing failed';

      await this.prismaService.storageObject.updateMany({
        where: {
          id: storageObject.id,
          status: StorageObjectStatus.processing,
        },
        data: {
          failedAt: new Date(),
          failureCode: this.failureCode(error),
          failureMessage: message,
          selected: false,
          status: StorageObjectStatus.failed,
        },
      });
    }
  }

  private async validateBytes(
    bytes: Buffer,
    policy: ContextFilePolicy,
  ): Promise<void> {
    if (bytes.byteLength === 0) {
      throw new Error('EMPTY_FILE');
    }

    const isDelimitedText =
      policy.family === 'spreadsheet' &&
      (policy.extension === '.csv' || policy.extension === '.tsv');

    if (policy.family === 'text' || isDelimitedText) {
      if (bytes.includes(0)) throw new Error('INVALID_TEXT');

      new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return;
    }

    if (policy.family === 'image') {
      const { fileTypeFromBuffer } = await import('file-type');
      const detected = await fileTypeFromBuffer(bytes);

      if (detected?.mime !== policy.canonicalMimeType) {
        throw new Error('MIME_MISMATCH');
      }

      await sharp(bytes).metadata();
      return;
    }

    if (policy.family === 'pdf') {
      await PDFDocument.load(bytes, {
        ignoreEncryption: false,
        updateMetadata: false,
      });
      return;
    }

    const { fileTypeFromBuffer } = await import('file-type');
    const detected = await fileTypeFromBuffer(bytes);

    if (
      detected !== undefined &&
      detected.mime !== policy.canonicalMimeType &&
      !this.isOfficeContainer(detected.mime, policy)
    ) {
      throw new Error('MIME_MISMATCH');
    }
  }

  private async prepareBytes(bytes: Buffer, policy: ContextFilePolicy) {
    if (policy.family === 'image') {
      const image = sharp(bytes, { failOn: 'warning' });
      const metadata = await image.metadata();
      const shouldResize =
        (metadata.width ?? 0) > 1500 || (metadata.height ?? 0) > 1500;
      const resized = shouldResize
        ? image.resize({
            fit: 'inside',
            height: 1500,
            width: 1500,
            withoutEnlargement: true,
          })
        : image;

      if (policy.canonicalMimeType === 'image/png') {
        return {
          bytes: await resized.png().toBuffer(),
          mimeType: 'image/png',
          version: IMAGE_PREPARATION_VERSION,
        };
      }

      if (policy.canonicalMimeType === 'image/webp') {
        return {
          bytes: await resized.webp({ quality: 88 }).toBuffer(),
          mimeType: 'image/webp',
          version: IMAGE_PREPARATION_VERSION,
        };
      }

      return {
        bytes: await resized.jpeg({ quality: 88, mozjpeg: true }).toBuffer(),
        mimeType: 'image/jpeg',
        version: IMAGE_PREPARATION_VERSION,
      };
    }

    if (policy.family === 'document') {
      return {
        bytes: await this.convertDocumentToPdf(bytes, policy),
        mimeType: 'application/pdf',
        version: DOCUMENT_PREPARATION_VERSION,
      };
    }

    return null;
  }

  private async convertDocumentToPdf(
    bytes: Buffer,
    policy: ContextFilePolicy,
  ): Promise<Buffer> {
    const directory = await mkdtemp(
      path.join(tmpdir(), 'featurewise-context-'),
    );
    const profileDirectory = path.join(directory, 'profile');
    const inputPath = path.join(directory, `input${policy.extension}`);
    const outputPath = path.join(directory, 'input.pdf');

    try {
      await writeFile(inputPath, bytes);
      await this.runLibreOffice([
        '--headless',
        '--nologo',
        '--nodefault',
        '--nolockcheck',
        '--nofirststartwizard',
        createLibreOfficeUserInstallationArgument(profileDirectory),
        '--convert-to',
        'pdf',
        '--outdir',
        directory,
        inputPath,
      ]);
      const pdf = await readFile(outputPath);
      await PDFDocument.load(pdf, {
        ignoreEncryption: false,
        updateMetadata: false,
      });

      return pdf;
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  }

  private runLibreOffice(args: readonly string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.config.libreOfficePath, args, {
        shell: false,
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      let stderr = '';
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('CONVERSION_TIMEOUT'));
      }, 120_000);

      child.stderr.on('data', (chunk: Buffer) => {
        stderr = `${stderr}${chunk.toString()}`.slice(-1000);
      });
      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`CONVERTER_UNAVAILABLE: ${error.message}`));
      });
      child.once('exit', (code) => {
        clearTimeout(timeout);
        if (code === 0) resolve();
        else
          reject(new Error(`CONVERSION_FAILED: ${stderr || `exit ${code}`}`));
      });
    });
  }

  private isOfficeContainer(
    detectedMime: string,
    policy: ContextFilePolicy,
  ): boolean {
    const compound = new Set(['.doc', '.ppt', '.xls']);
    return (
      detectedMime === 'application/x-cfb' && compound.has(policy.extension)
    );
  }

  private preparedPrefix(originalKey: string): string {
    return `${originalKey.slice(0, -'/original'.length)}/prepared`;
  }

  private sha256Base64(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('base64');
  }

  private failureCode(error: unknown): string {
    if (!(error instanceof Error)) return 'PROCESSING_FAILED';

    return error.message.split(':', 1)[0]?.slice(0, 80) || 'PROCESSING_FAILED';
  }
}
