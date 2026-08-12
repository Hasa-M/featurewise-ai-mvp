CREATE TYPE "StorageObjectStatus" AS ENUM ('pending_upload', 'processing', 'ready', 'failed');

ALTER TABLE "context_artifact" RENAME COLUMN "content" TO "prompt_content";

ALTER TABLE "storage_object"
  ADD COLUMN "created_by" UUID,
  ADD COLUMN "status" "StorageObjectStatus" NOT NULL DEFAULT 'pending_upload',
  ADD COLUMN "selected" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "upload_key" TEXT,
  ADD COLUMN "upload_version_id" TEXT,
  ADD COLUMN "s3_version_id" TEXT,
  ADD COLUMN "etag" TEXT,
  ADD COLUMN "checksum_sha256" TEXT,
  ADD COLUMN "prepared_s3_key" TEXT,
  ADD COLUMN "prepared_s3_version_id" TEXT,
  ADD COLUMN "prepared_mime_type" TEXT,
  ADD COLUMN "prepared_size_bytes" BIGINT,
  ADD COLUMN "prepared_checksum_sha256" TEXT,
  ADD COLUMN "preparation_version" TEXT,
  ADD COLUMN "failure_code" TEXT,
  ADD COLUMN "failure_message" TEXT,
  ADD COLUMN "upload_expires_at" TIMESTAMPTZ(6),
  ADD COLUMN "confirmed_at" TIMESTAMPTZ(6),
  ADD COLUMN "ready_at" TIMESTAMPTZ(6),
  ADD COLUMN "failed_at" TIMESTAMPTZ(6),
  ADD COLUMN "unselected_at" TIMESTAMPTZ(6),
  ADD COLUMN "first_used_at" TIMESTAMPTZ(6),
  ADD COLUMN "purge_requested_at" TIMESTAMPTZ(6),
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "storage_object" AS storage
SET "created_by" = COALESCE(feature."created_by", feature_update."created_by"),
    "status" = 'failed',
    "selected" = false,
    "upload_key" = 'legacy-unverified/' || storage."storage_object_id"::text,
    "checksum_sha256" = 'LEGACY_UNVERIFIED',
    "upload_expires_at" = storage."created_at",
    "failed_at" = CURRENT_TIMESTAMP,
    "first_used_at" = storage."created_at",
    "failure_code" = 'LEGACY_UNVERIFIED',
    "failure_message" = 'Legacy object requires a new verified upload'
FROM "context_artifact" AS context
LEFT JOIN "feature" AS feature ON feature."feature_id" = context."feature_id"
LEFT JOIN "feature_update" AS feature_update ON feature_update."feature_update_id" = context."feature_update_id"
WHERE context."context_artifact_id" = storage."context_artifact_id";

ALTER TABLE "storage_object"
  ALTER COLUMN "created_by" SET NOT NULL,
  ALTER COLUMN "upload_key" SET NOT NULL,
  ALTER COLUMN "checksum_sha256" SET NOT NULL,
  ALTER COLUMN "upload_expires_at" SET NOT NULL,
  DROP COLUMN "extracted_text",
  ADD CONSTRAINT "storage_object_size_positive" CHECK ("size_bytes" > 0),
  ADD CONSTRAINT "storage_object_prepared_size_positive" CHECK ("prepared_size_bytes" IS NULL OR "prepared_size_bytes" > 0),
  ADD CONSTRAINT "storage_object_ready_metadata" CHECK (
    "status" <> 'ready' OR
    ("ready_at" IS NOT NULL AND "s3_version_id" IS NOT NULL AND "preparation_version" IS NOT NULL)
  ),
  ADD CONSTRAINT "storage_object_failed_metadata" CHECK (
    "status" <> 'failed' OR ("failed_at" IS NOT NULL AND "failure_code" IS NOT NULL)
  );

CREATE UNIQUE INDEX "storage_object_upload_key_key" ON "storage_object"("upload_key");
CREATE UNIQUE INDEX "storage_object_prepared_s3_key_key" ON "storage_object"("prepared_s3_key");
CREATE INDEX "storage_object_context_status_selected_idx" ON "storage_object"("context_artifact_id", "status", "selected");
CREATE INDEX "storage_object_status_upload_expiry_idx" ON "storage_object"("status", "upload_expires_at");
CREATE INDEX "storage_object_status_failed_at_idx" ON "storage_object"("status", "failed_at");
CREATE INDEX "storage_object_purge_requested_at_idx" ON "storage_object"("purge_requested_at");
CREATE INDEX "storage_object_created_by_idx" ON "storage_object"("created_by");

ALTER TABLE "storage_object" ADD CONSTRAINT "storage_object_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
