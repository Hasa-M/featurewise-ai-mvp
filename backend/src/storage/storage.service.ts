import { randomUUID } from 'node:crypto';

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { StorageConfig } from '../config/storage.config';

export interface ContextStorageKeys {
  readonly originalKey: string;
  readonly preparedPrefix: string;
  readonly uploadKey: string;
}

export interface StorageObjectHead {
  readonly checksumSha256: string | null;
  readonly contentLength: number;
  readonly contentType: string | null;
  readonly etag: string | null;
  readonly versionId: string | null;
}

export interface StoredObjectResult {
  readonly checksumSha256: string | null;
  readonly etag: string | null;
  readonly versionId: string | null;
}

@Injectable()
export class StorageService {
  private readonly config: StorageConfig;
  private readonly client: S3Client;

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<StorageConfig>('storage');
    this.client = new S3Client({ region: this.config.region });
  }

  createContextKeys(input: {
    readonly contextKey: string;
    readonly organizationKey: string;
    readonly projectKey: string;
  }): ContextStorageKeys {
    const token = randomUUID();
    const prefix = this.config.keyPrefix.replace(/^\/+|\/+$/g, '');
    const objectPrefix = [
      prefix,
      'organizations',
      this.safeSegment(input.organizationKey),
      'projects',
      this.safeSegment(input.projectKey),
      'contexts',
      this.safeSegment(input.contextKey),
      'objects',
      token,
    ].join('/');

    return {
      originalKey: `${objectPrefix}/original`,
      preparedPrefix: `${objectPrefix}/prepared`,
      uploadKey: `${prefix}/staging/${randomUUID()}`,
    };
  }

  createPreparedKey(
    preparedPrefix: string,
    preparationVersion: string,
  ): string {
    return `${preparedPrefix}/${this.safeSegment(preparationVersion)}/${randomUUID()}`;
  }

  async createUpload(input: {
    readonly checksumSha256: string;
    readonly contentType: string;
    readonly key: string;
    readonly maxBytes: number;
  }) {
    this.requireBucket();
    const result = await createPresignedPost(this.client, {
      Bucket: this.config.bucket,
      Key: input.key,
      Expires: this.config.uploadTtlSeconds,
      Fields: {
        'Content-Type': input.contentType,
        'x-amz-checksum-algorithm': 'SHA256',
        'x-amz-checksum-sha256': input.checksumSha256,
      },
      Conditions: [
        ['content-length-range', 1, input.maxBytes],
        { 'Content-Type': input.contentType },
        { 'x-amz-checksum-algorithm': 'SHA256' },
        { 'x-amz-checksum-sha256': input.checksumSha256 },
      ],
    });

    return {
      ...result,
      expiresAt: new Date(Date.now() + this.config.uploadTtlSeconds * 1000),
    };
  }

  async headObject(key: string): Promise<StorageObjectHead> {
    this.requireBucket();
    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.config.bucket,
        ChecksumMode: 'ENABLED',
        Key: key,
      }),
    );

    return {
      checksumSha256: response.ChecksumSHA256 ?? null,
      contentLength: response.ContentLength ?? 0,
      contentType: response.ContentType ?? null,
      etag: response.ETag?.replaceAll('"', '') ?? null,
      versionId: response.VersionId ?? null,
    };
  }

  async copyObject(input: {
    readonly checksumSha256: string;
    readonly contentType: string;
    readonly destinationKey: string;
    readonly sourceKey: string;
    readonly sourceVersionId?: string | null;
  }): Promise<StoredObjectResult> {
    this.requireBucket();
    const source = `${this.config.bucket}/${this.encodeKey(input.sourceKey)}${
      input.sourceVersionId
        ? `?versionId=${encodeURIComponent(input.sourceVersionId)}`
        : ''
    }`;
    const response = await this.client.send(
      new CopyObjectCommand({
        Bucket: this.config.bucket,
        ChecksumAlgorithm: 'SHA256',
        ContentType: input.contentType,
        CopySource: source,
        Key: input.destinationKey,
        MetadataDirective: 'REPLACE',
        Metadata: {
          checksumSha256: input.checksumSha256,
        },
      }),
    );

    return {
      checksumSha256:
        response.CopyObjectResult?.ChecksumSHA256 ?? input.checksumSha256,
      etag: response.CopyObjectResult?.ETag?.replaceAll('"', '') ?? null,
      versionId: response.VersionId ?? null,
    };
  }

  async getObjectBytes(
    key: string,
    versionId?: string | null,
  ): Promise<Buffer> {
    this.requireBucket();
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        VersionId: versionId ?? undefined,
      }),
    );

    if (response.Body === undefined) {
      throw new ServiceUnavailableException('Stored file is unavailable');
    }

    return Buffer.from(await response.Body.transformToByteArray());
  }

  async putObject(input: {
    readonly body: Buffer;
    readonly checksumSha256: string;
    readonly contentType: string;
    readonly key: string;
  }): Promise<StoredObjectResult> {
    this.requireBucket();
    const response = await this.client.send(
      new PutObjectCommand({
        Body: input.body,
        Bucket: this.config.bucket,
        ChecksumSHA256: input.checksumSha256,
        ContentLength: input.body.byteLength,
        ContentType: input.contentType,
        Key: input.key,
      }),
    );

    return {
      checksumSha256: response.ChecksumSHA256 ?? input.checksumSha256,
      etag: response.ETag?.replaceAll('"', '') ?? null,
      versionId: response.VersionId ?? null,
    };
  }

  async createAccessUrl(input: {
    readonly contentDisposition: string;
    readonly key: string;
    readonly versionId?: string | null;
  }) {
    this.requireBucket();
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: input.key,
        ResponseCacheControl: 'no-store',
        ResponseContentDisposition: input.contentDisposition,
        VersionId: input.versionId ?? undefined,
      }),
      { expiresIn: this.config.downloadTtlSeconds },
    );

    return {
      expiresAt: new Date(Date.now() + this.config.downloadTtlSeconds * 1000),
      url,
    };
  }

  async deleteObject(key: string, versionId?: string | null): Promise<void> {
    this.requireBucket();
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        VersionId: versionId ?? undefined,
      }),
    );
  }

  private requireBucket(): void {
    if (this.config.bucket === '') {
      throw new ServiceUnavailableException('S3 storage is not configured');
    }
  }

  private safeSegment(value: string): string {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error('Unsafe storage key segment');
    }

    return value;
  }

  private encodeKey(value: string): string {
    return value.split('/').map(encodeURIComponent).join('/');
  }
}
