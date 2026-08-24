import { registerAs } from '@nestjs/config';

export interface StorageConfig {
  readonly bucket: string;
  readonly downloadTtlSeconds: number;
  readonly failedRetentionDays: number;
  readonly keyPrefix: string;
  readonly libreOfficePath: string;
  readonly pendingTtlHours: number;
  readonly processingTimeoutSeconds: number;
  readonly region: string;
  readonly sweepIntervalSeconds: number;
  readonly uploadTtlSeconds: number;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const storageConfig = registerAs(
  'storage',
  (): StorageConfig => ({
    bucket: process.env.S3_BUCKET?.trim() ?? '',
    downloadTtlSeconds: positiveInteger(
      process.env.S3_DOWNLOAD_TTL_SECONDS,
      300,
    ),
    failedRetentionDays: positiveInteger(
      process.env.STORAGE_FAILED_RETENTION_DAYS,
      7,
    ),
    keyPrefix: process.env.S3_KEY_PREFIX?.trim() || 'dev',
    libreOfficePath:
      process.env.LIBREOFFICE_PATH?.trim() ||
      '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    pendingTtlHours: positiveInteger(process.env.STORAGE_PENDING_TTL_HOURS, 24),
    processingTimeoutSeconds: positiveInteger(
      process.env.STORAGE_PROCESSING_TIMEOUT_SECONDS,
      600,
    ),
    region: process.env.AWS_REGION?.trim() || 'eu-south-1',
    sweepIntervalSeconds: positiveInteger(
      process.env.STORAGE_SWEEP_INTERVAL_SECONDS,
      3600,
    ),
    uploadTtlSeconds: positiveInteger(process.env.S3_UPLOAD_TTL_SECONDS, 900),
  }),
);
